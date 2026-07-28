from django.conf import settings

from .compliance import COMPLIANCE_CONTEXT


def compliance(request):
    return {
        **COMPLIANCE_CONTEXT,
        "BITRIX_SITE_BUTTON_URL": settings.BITRIX_SITE_BUTTON_URL,
    }
