from django.conf import settings

from .compliance import COMPLIANCE_CONTEXT
from .site_config import CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_HREF


def compliance(request):
    return {
        **COMPLIANCE_CONTEXT,
        "BITRIX_SITE_BUTTON_URL": settings.BITRIX_SITE_BUTTON_URL,
        "CONTACT_EMAIL": CONTACT_EMAIL,
        "CONTACT_PHONE_DISPLAY": CONTACT_PHONE_DISPLAY,
        "CONTACT_PHONE_HREF": CONTACT_PHONE_HREF,
    }
