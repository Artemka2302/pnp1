"""Server-side company suggestions; provider credentials never reach the browser."""
import hashlib
import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core import signing
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_POST

TOKEN_SALT = "pnp-company-selection-v1"
TOKEN_MAX_AGE = 3600


def lookup_configured():
    return bool(os.getenv("DADATA_API_KEY", "").strip())


def selected_company(token):
    try:
        data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    return data if isinstance(data, dict) and data.get("name") and data.get("inn") else None


def _consume_limit(key, limit, seconds):
    if cache.add(key, 1, seconds):
        return False
    try:
        return cache.incr(key) > limit
    except ValueError:
        return False


def provider_suggestions(query):
    req = Request(
        "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party",
        data=json.dumps({"query": query, "count": 5}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json",
                 "Authorization": "Token " + os.environ["DADATA_API_KEY"].strip()},
        method="POST",
    )
    with urlopen(req, timeout=4) as response:
        result = json.loads(response.read(262144).decode("utf-8"))
    if not isinstance(result, dict) or not isinstance(result.get("suggestions"), list):
        raise ValueError("Invalid suggestions response")
    records = []
    for item in result["suggestions"][:5]:
        if not isinstance(item, dict) or not isinstance(item.get("data"), dict):
            continue
        data = item["data"]
        inn = str(data.get("inn") or "")
        if not re.fullmatch(r"(?:[0-9]{10}|[0-9]{12})", inn):
            continue
        if query.isascii() and query.isdigit() and len(query) in (10, 12) and query != inn:
            continue
        name = str(item.get("value") or "").strip()[:220]
        if not name:
            continue
        records.append({
            "name": name,
            "inn": inn,
            "kpp": str(data.get("kpp") or "")[:9],
            "ogrn": str(data.get("ogrn") or "")[:15],
            "address": str((data.get("address") or {}).get("value") or "")[:500],
            "status": str((data.get("state") or {}).get("status") or "")[:40],
        })
    return records


@require_POST
def company_suggestions_api(request):
    if request.content_type != "application/json" or len(request.body) > 2048:
        return JsonResponse({"ok": False, "error": "Некорректный запрос."}, status=400)
    try:
        body = json.loads(request.body)
        query = body.get("query") if isinstance(body, dict) else None
    except (ValueError, UnicodeDecodeError):
        query = None
    if not isinstance(query, str) or not 3 <= len(query.strip()) <= 100:
        return JsonResponse({"ok": False, "error": "Введите от 3 до 100 символов."}, status=400)
    if not lookup_configured():
        return JsonResponse({"ok": False, "manual": True,
                             "error": "Поиск по ИНН пока недоступен. Укажите название компании — менеджер уточнит реквизиты."}, status=503)
    # Use the same trusted proxy policy as the lead endpoint.
    from .views import client_ip
    ip_hash = hashlib.sha256(str(client_ip(request)).encode()).hexdigest()
    if _consume_limit("company-rate:" + ip_hash, 30, 60):
        return JsonResponse({"ok": False, "error": "Слишком много запросов. Попробуйте через минуту."}, status=429)
    query = query.strip()
    cache_key = "company-query:" + hashlib.sha256(query.casefold().encode()).hexdigest()
    records = cache.get(cache_key)
    if records is None:
        if _consume_limit("company-provider-budget", 5000, 86400):
            return JsonResponse({"ok": False, "error": "Поиск временно недоступен. Попробуйте позже."}, status=503)
        try:
            records = provider_suggestions(query)
        except (HTTPError, URLError, OSError, ValueError, TypeError, AttributeError):
            return JsonResponse({"ok": False, "error": "Поиск временно недоступен. Попробуйте позже."}, status=503)
        cache.set(cache_key, records, 600)
    response = JsonResponse({"ok": True, "suggestions": [
        {"name": record["name"], "inn": record["inn"], "address": record["address"],
         "token": signing.dumps(record, salt=TOKEN_SALT, compress=True)} for record in records
    ]})
    response["Cache-Control"] = "no-store"
    return response
