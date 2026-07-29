import hashlib
import re

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse


CRAWLER_PATTERN = re.compile(
    r"bot|crawler|spider|slurp|bingpreview|facebookexternalhit|go-http-client|python-requests",
    re.IGNORECASE,
)
THROTTLED_PREFIXES = ("/catalog/", "/vendors/", "/partners/", "/api/catalog-node/", "/api/catalog-search/")


class CatalogCrawlThrottleMiddleware:
    window_seconds = 10 * 60
    crawler_limit = 30
    visitor_limit = 180

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in {"GET", "HEAD"} and request.path.startswith(THROTTLED_PREFIXES):
            response = self.throttle_response(request)
            if response is not None:
                return response
        return self.get_response(request)

    def throttle_response(self, request):
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        is_crawler = bool(CRAWLER_PATTERN.search(user_agent))
        limit = self.crawler_limit if is_crawler else self.visitor_limit
        source = self.client_ip(request)
        identity = hashlib.sha256(f"{source}|{int(is_crawler)}".encode()).hexdigest()[:24]
        cache_key = f"pnp:crawl:{identity}"

        try:
            if cache.add(cache_key, 1, timeout=self.window_seconds):
                return None
            count = cache.incr(cache_key)
        except Exception:
            return None

        if count <= limit:
            return None

        headers = {"Retry-After": str(self.window_seconds)}
        if request.path.startswith("/api/"):
            return JsonResponse({"ok": False, "error": "rate_limited"}, status=429, headers=headers)
        return HttpResponse("Too many requests", status=429, headers=headers, content_type="text/plain; charset=utf-8")

    @staticmethod
    def client_ip(request):
        if getattr(settings, "TRUST_X_FORWARDED_FOR", False):
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
            if forwarded:
                return forwarded.split(",", 1)[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")
