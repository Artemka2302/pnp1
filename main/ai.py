import json
import logging
import os

from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)

DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEFAULT_DEEPSEEK_MODEL = "deepseek-chat"
DEFAULT_DEEPSEEK_TIMEOUT_SECONDS = 25
MAX_DEEPSEEK_RESPONSE_BYTES = 256 * 1024

SYSTEM_PROMPT = """
Ты AI-помощник компании ПНП по комплексной комплектации строительных объектов.
Отвечай по-русски, спокойно, профессионально и коротко. Твоя задача — понять
потребность клиента, уточнить важные данные и поддерживать полный черновик заявки.

Правила диалога:
- учитывай всю переданную историю и не спрашивай повторно известные данные;
- определяй направление, категорию, объект или город, позиции, количество,
  характеристики, срок, логистику, аналоги и комплектующие, если это уместно;
- за один ответ задавай не больше одного главного уточняющего вопроса;
- если клиент пишет «не 800, а 1000», «убери», «оставь только», обновляй текущий
  черновик, а не добавляй противоречащие сведения;
- сохраняй единицы измерения так, как их указал клиент: шт, м2, м3, тонны,
  паллеты, машины и другие;
- не обещай точную цену, наличие, срок, сертификаты или совместимость без
  проверки менеджером;
- не выдумывай производителей и не называй ПНП официальным представителем,
  если этого нет в переданном контексте;
- не говори, что заявка уже отправлена: её отправляет пользователь отдельной
  кнопкой после проверки черновика;
- не возвращай HTML, Markdown, ссылки или пояснения вне результата.

Разрешённые направления ПНП: архитектурные решения, конструктивные решения,
ЭОМ, водоснабжение и водоотведение, ОВиК и тепловые сети, пожарная безопасность,
слаботочные сети и связь, IT-инфраструктура, газоснабжение, вертикальный
транспорт, технологическое оборудование и доступная среда.

Верни только один валидный JSON-объект строго следующего вида:
{
  "answer": "Короткий ответ пользователю и один важный вопрос при необходимости",
  "ready": false,
  "lead_draft": {
    "direction": "Направление или пустая строка",
    "category": "Категория или пустая строка",
    "object_name": "Объект или город либо пустая строка",
    "message": "Полная актуальная суть заявки для менеджера",
    "missing_fields": ["данные, которые ещё желательно уточнить"]
  }
}

Если сообщение не относится к заявке, например это только приветствие,
lead_draft может быть null. Поле ready означает, что уже есть содержательная
суть заявки; отсутствие необязательных уточнений не мешает ready быть true.
""".strip()


class AiConfigurationError(Exception):
    """DeepSeek integration is not configured safely."""


class AiProviderError(Exception):
    """DeepSeek could not provide a usable HTTP response."""


class AiResponseError(Exception):
    """DeepSeek returned an invalid structured response."""


def clean_ai_text(value, max_length):
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


def normalize_ai_history(value):
    if isinstance(value, list) == False:
        return []
    normalized = []
    for item in value:
        if isinstance(item, dict) == False:
            continue
        if item.get("role") not in ['user', 'assistant']:
            continue
        cont =item.get("content")
        if isinstance(cont, str) == False:
            continue

        cont = cont.strip()[:900]
        if cont == "":
            continue

        item = {
            "role":  item.get("role"),
            "content": cont,
        }
        normalized.append(item)
    normalized = normalized[-10:]
    return normalized


def normalize_lead_draft(value):
    if not isinstance(value, dict):
        return {}

    direction = clean_ai_text(value.get("direction"), 220)
    category = clean_ai_text(value.get("category"), 220)
    if not direction:
        direction = category
    if not category:
        category = direction

    object_name = clean_ai_text(
        value.get("object_name") or value.get("object") or value.get("city"),
        220,
    )
    message = clean_ai_text(
        value.get("message") or value.get("summary") or value.get("request_text"),
        5000,
    )

    raw_missing = value.get("missing_fields")
    if raw_missing is None:
        raw_missing = value.get("missingFields")
    if not isinstance(raw_missing, list):
        raw_missing = []

    missing_fields = []
    for item in raw_missing:
        cleaned = clean_ai_text(item, 80)
        if cleaned and cleaned not in missing_fields:
            missing_fields.append(cleaned)
        if len(missing_fields) == 6:
            break

    draft = {
        "direction": direction,
        "category": category,
        "object_name": object_name,
        "message": message,
        "missing_fields": missing_fields,
    }
    if not any((direction, category, object_name, message, missing_fields)):
        return {}
    return draft


def normalize_catalog_items(value):
    if not isinstance(value, list):
        return []
    normalized = []
    for item in value:
        cleaned = clean_ai_text(item, 800)
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
        if len(normalized) == 30:
            break
    return normalized


def normalize_ai_page(value):
    page = clean_ai_text(value, 200)
    return page if page.startswith("/") else ""


def build_ai_messages(message, history=None, lead_draft=None, catalog_items=None, page=""):
    current_message = clean_ai_text(message, 2000)
    safe_history = normalize_ai_history(history)
    safe_draft = normalize_lead_draft(lead_draft)
    safe_items = normalize_catalog_items(catalog_items)
    safe_page = normalize_ai_page(page)
    context = {
        "previous_lead_draft": safe_draft or None,
        "selected_catalog_items": safe_items,
        "page": safe_page,
    }
    system_content = (
        f"{SYSTEM_PROMPT}\n\n"
        "Контекст текущего обращения в формате JSON:\n"
        f"{json.dumps(context, ensure_ascii=False)}"
    )
    return [
        {"role": "system", "content": system_content},
        *safe_history,
        {"role": "user", "content": current_message},
    ]


def deepseek_model_name():
    return clean_ai_text(os.getenv("DEEPSEEK_MODEL", DEFAULT_DEEPSEEK_MODEL), 120) or DEFAULT_DEEPSEEK_MODEL


def deepseek_endpoint():
    base_url = clean_ai_text(os.getenv("DEEPSEEK_BASE_URL", DEFAULT_DEEPSEEK_BASE_URL), 500).rstrip("/")
    parsed = urlparse(base_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise AiConfigurationError("invalid_deepseek_base_url")
    if parsed.path.rstrip("/").endswith("/chat/completions"):
        return base_url
    return f"{base_url}/chat/completions"


def deepseek_timeout_seconds():
    try:
        timeout = int(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", DEFAULT_DEEPSEEK_TIMEOUT_SECONDS))
    except (TypeError, ValueError):
        timeout = DEFAULT_DEEPSEEK_TIMEOUT_SECONDS
    return max(3, min(timeout, 60))


def call_deepseek(messages):
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise AiConfigurationError("deepseek_api_key_missing")

    payload = {
        "model": deepseek_model_name(),
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
        "stream": False,
    }
    request = Request(
        deepseek_endpoint(),
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=deepseek_timeout_seconds()) as response:
            raw_response = response.read(MAX_DEEPSEEK_RESPONSE_BYTES + 1)
    except HTTPError as error:
        logger.warning("DeepSeek request failed with HTTP status %s", error.code)
        raise AiProviderError("deepseek_http_error") from error
    except (URLError, TimeoutError, OSError) as error:
        logger.warning("DeepSeek request failed: %s", type(error).__name__)
        raise AiProviderError("deepseek_unavailable") from error

    if len(raw_response) > MAX_DEEPSEEK_RESPONSE_BYTES:
        raise AiProviderError("deepseek_response_too_large")

    try:
        response_payload = json.loads(raw_response.decode("utf-8"))
        choices = response_payload.get("choices")
        first_choice = choices[0]
        content = first_choice["message"]["content"]
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError, IndexError, KeyError, TypeError) as error:
        raise AiProviderError("invalid_deepseek_response") from error

    content = clean_ai_text(content, 20000)
    if not content:
        raise AiProviderError("empty_deepseek_response")
    return content


def parse_ai_result(content, previous_draft=None):
    text = clean_ai_text(content, 20000)
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as error:
        raise AiResponseError("invalid_ai_json") from error
    if not isinstance(result, dict):
        raise AiResponseError("invalid_ai_result")

    answer = clean_ai_text(result.get("answer"), 2200)
    if not answer:
        raise AiResponseError("empty_ai_answer")

    candidate_value = result.get("lead_draft", result.get("leadDraft"))
    previous = normalize_lead_draft(previous_draft)
    if candidate_value is None:
        draft = previous or None
    elif not isinstance(candidate_value, dict):
        raise AiResponseError("invalid_ai_lead_draft")
    else:
        candidate = normalize_lead_draft(candidate_value)
        aliases = {
            "direction": ("direction",),
            "category": ("category",),
            "object_name": ("object_name", "object", "city"),
            "message": ("message", "summary", "request_text"),
            "missing_fields": ("missing_fields", "missingFields"),
        }
        for field, field_aliases in aliases.items():
            if not any(alias in candidate_value for alias in field_aliases) and field in previous:
                candidate[field] = previous[field]
        draft = candidate if any(candidate.get(field) for field in ("direction", "category", "object_name", "message")) else None

    ready_value = result.get("ready", False)
    ready = ready_value is True or (
        isinstance(ready_value, str) and ready_value.strip().lower() in {"1", "true", "yes"}
    )
    return {
        "answer": answer,
        "ready": bool(ready and draft),
        "lead_draft": draft,
    }
