import base64
import json
import logging
import os
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .models import Lead

logger = logging.getLogger(__name__)


def normalized_webhook_url():
    webhook_url = os.getenv("BITRIX_WEBHOOK_URL", "").strip().rstrip("/")
    if not webhook_url:
        return ""

    parsed = urlparse(webhook_url)
    if parsed.scheme != "https" or not parsed.netloc or "/rest/" not in parsed.path:
        raise ValueError("BITRIX_WEBHOOK_URL must be an https Bitrix REST webhook URL")
    return webhook_url


def call_bitrix_method(webhook_url, method, payload):
    url = f"{webhook_url}/{method}.json"
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def build_bitrix_comment(lead):
    lines = [f"Заявка #{lead.pk} с сайта ПНП"]

    direction = lead.direction or lead.category
    if direction:
        lines.extend(["", f"Направление: {direction}"])
    if lead.object_name:
        lines.append(f"Объект: {lead.object_name}")
    if lead.message or lead.request_text:
        lines.extend(["", "Комментарий:", lead.message or lead.request_text])

    items = list(lead.items.all())
    if items:
        lines.extend(["", "Позиции из каталога:"])
        for item in items:
            item_title = " / ".join(
                part for part in [
                    item.system_title,
                    item.product_group_title,
                    item.product_type_title,
                ]
                if part
            )
            lines.append(f"- {item_title or item}")

    return "\n".join(lines)


def build_bitrix_file_payloads(lead):
    files = []
    for upload in lead.uploads.all():
        if not upload.file:
            continue
        upload.file.open("rb")
        try:
            encoded_content = base64.b64encode(upload.file.read()).decode("ascii")
        finally:
            upload.file.close()
        files.append([upload.original_name, encoded_content])
    return files


def attach_files_to_bitrix_lead(webhook_url, lead, bitrix_id):
    files = build_bitrix_file_payloads(lead)
    if not files:
        return {"sent": False, "files_count": 0}

    payload = {
        "fields": {
            "ENTITY_ID": int(bitrix_id) if str(bitrix_id).isdigit() else bitrix_id,
            "ENTITY_TYPE": "lead",
            "COMMENT": f"Файлы из заявки #{lead.pk}",
            "FILES": files,
        },
    }
    data = call_bitrix_method(webhook_url, "crm.timeline.comment.add", payload)
    if data.get("error"):
        return {
            "sent": False,
            "files_count": len(files),
            "error": data.get("error_description") or data.get("error"),
        }
    return {"sent": True, "files_count": len(files), "comment_id": data.get("result")}


def build_bitrix_payload(lead):
    fields = {
        "TITLE": f"Заявка с сайта ПНП #{lead.pk}",
        "NAME": lead.contact_name or lead.company or "Клиент сайта",
        "SOURCE_ID": "WEB",
        "OPENED": "Y",
        "COMMENTS": build_bitrix_comment(lead),
    }
    if lead.phone:
        fields["PHONE"] = [{"VALUE": lead.phone, "VALUE_TYPE": "WORK"}]

    if lead.email:
        fields["EMAIL"] = [{"VALUE": lead.email, "VALUE_TYPE": "WORK"}]

    if lead.company:
        fields["COMPANY_TITLE"] = lead.company

    return {
        "fields": fields,
        "params": {"REGISTER_SONET_EVENT": "Y"},
    }


def send_lead_to_bitrix(lead):
    try:
        webhook_url = normalized_webhook_url()
        if not webhook_url:
            return {"configured": False, "sent": False}
        payload = build_bitrix_payload(lead)
        data = call_bitrix_method(webhook_url, "crm.lead.add", payload)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as error:
        logger.exception("Bitrix lead submit failed for lead_id=%s", lead.pk)
        lead.status = Lead.STATUS_FAILED
        lead.save(update_fields=["status"])
        return {"configured": True, "sent": False, "error": str(error)}

    if data.get("error"):
        error_text = data.get("error_description") or data.get("error")
        logger.error("Bitrix rejected lead_id=%s: %s", lead.pk, error_text)
        lead.status = Lead.STATUS_FAILED
        lead.save(update_fields=["status"])
        return {"configured": True, "sent": False, "error": error_text}

    bitrix_id = data.get("result")
    if not bitrix_id:
        logger.error("Bitrix response without result for lead_id=%s: %s", lead.pk, data)
        lead.status = Lead.STATUS_FAILED
        lead.save(update_fields=["status"])
        return {"configured": True, "sent": False, "error": "missing_result"}

    lead.bitrix_lead_id = str(bitrix_id)
    lead.status = Lead.STATUS_SENT_TO_BITRIX
    lead.save(update_fields=["bitrix_lead_id", "status"])

    try:
        files_result = attach_files_to_bitrix_lead(webhook_url, lead, lead.bitrix_lead_id)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as error:
        logger.exception("Bitrix file attach failed for lead_id=%s", lead.pk)
        files_result = {"sent": False, "files_count": lead.uploads.count(), "error": str(error)}

    if files_result.get("error"):
        logger.error("Bitrix file attach failed for lead_id=%s: %s", lead.pk, files_result["error"])

    return {
        "configured": True,
        "sent": True,
        "bitrix_id": lead.bitrix_lead_id,
        "files_sent": files_result["sent"],
        "files_count": files_result["files_count"],
    }
