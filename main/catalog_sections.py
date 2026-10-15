"""Presentation-only project navigation. No changes to catalog IDs or CRM paths.

See docs/catalog-project-structure.txt for sources and mapping boundaries.
"""

PROJECT_GROUPS = {
    "building": "Архитектура и конструкции",
    "engineering": "ИОС — Инженерные системы",
    "technology": "ТХ — Технологические решения",
    "fire": "ПБ — Мероприятия по обеспечению пожарной безопасности",
    "accessibility": "ОДИ — Мероприятия по обеспечению доступа инвалидов",
    "landscaping": "ГП — Благоустройство и озеленение",
}

# Order within engineering follows PP 87, paragraph 15. Related commercial
# directions sit beside their parent discipline; they are not statutory sections.
PROJECT_DIRECTIONS = {
    "architecture": ("building", "АР", "Архитектурные решения", "Раздел 3 · Объёмно-планировочные и архитектурные решения", ("АР", "АС", "АИ")),
    "constructive": ("building", "КР", "Конструктивные решения", "Раздел 4 · Конструктивные решения", ("КЖ", "КМ", "КД")),
    "eom": ("engineering", "ЭОМ", "Силовое электрооборудование и электрическое освещение", "ИОС · Система электроснабжения", ("ЭО", "ЭМ", "ЭН", "ЭС")),
    "ev-charging-infrastructure": ("engineering", "ЭОМ", "Силовое электрооборудование и электрическое освещение", "Направление комплектации · Зарядная инфраструктура", ("ЭМ", "ЭС")),
    "water": ("engineering", "ВК", "Водоснабжение и водоотведение", "ИОС · Системы водоснабжения и водоотведения", ("ВК", "НВ", "НК", "НВК", "АВК")),
    "hvac": ("engineering", "ОВ", "Отопление, вентиляция и кондиционирование", "ИОС · Отопление, вентиляция, кондиционирование и тепловые сети", ("ОВ", "ТС", "ТМ", "АОВ")),
    "low-current": ("engineering", "СС", "Сети связи и слаботочные системы", "ИОС · Сети связи", ("СС", "СКУД", "ОС")),
    "it-infrastructure": ("engineering", "ИТ", "Информационные технологии", "Направление комплектации · ИТ-инфраструктура", ()),
    "gas": ("engineering", "ГС", "Газоснабжение", "ИОС · Система газоснабжения", ("ГС", "ГСН")),
    "tech-equipment": ("technology", "ТХ", "Технологические решения", "Раздел 6 · Технологические решения", ("ТХ",)),
    "vertical-transport": ("technology", "ТХ", "Технологические решения", "Направление комплектации · Вертикальный транспорт", ("ТХ",)),
    "fire": ("fire", "ПБ", "Пожарная безопасность", "Раздел 9 · Мероприятия по обеспечению пожарной безопасности", ("ПС", "АПС", "СОУЭ")),
    "accessibility": ("accessibility", "ОДИ", "Обеспечение доступа инвалидов", "Раздел 11 · Мероприятия по обеспечению доступа инвалидов", ()),
    "landscaping-and-site-improvement": ("landscaping", "ГП", "Генеральный план", "Направление комплектации · Благоустройство и озеленение", ("ГП", "ЭН")),
}

# Working drawing marks and familiar system abbreviations are explained, not
# advertised as an exhaustive or mandatory list of statutory project sections.
DRAWING_MARKS = {
    "АР": "Архитектурные решения",
    "АС": "Архитектурно-строительные решения",
    "АИ": "Интерьеры",
    "КЖ": "Конструкции железобетонные",
    "КМ": "Конструкции металлические",
    "КД": "Конструкции деревянные",
    "ЭО": "Электрическое освещение (внутреннее)",
    "ЭМ": "Силовое электрооборудование",
    "ЭН": "Наружное электроосвещение",
    "ЭС": "Электроснабжение",
    "ВК": "Внутренние системы водоснабжения и канализации",
    "НВ": "Наружные сети водоснабжения",
    "НК": "Наружные сети канализации",
    "НВК": "Наружные сети водоснабжения и канализации",
    "ОВ": "Отопление, вентиляция и кондиционирование",
    "ТС": "Тепломеханические решения тепловых сетей",
    "ТМ": "Тепломеханические решения",
    "СС": "Системы связи",
    "СКУД": "Система контроля и управления доступом",
    "ОС": "Охранная сигнализация",
    "АОВ": "Автоматизация отопления и вентиляции",
    "АВК": "Автоматизация водоснабжения и канализации",
    "ГС": "Газоснабжение (внутренние устройства)",
    "ГСН": "Наружные газопроводы",
    "ТХ": "Технология производства",
    "ПС": "Пожарная сигнализация",
    "АПС": "Автоматическая пожарная сигнализация",
    "СОУЭ": "Система оповещения и управления эвакуацией",
    "ГП": "Генеральный план",
}


def project_section(direction_slug):
    entry = PROJECT_DIRECTIONS.get(direction_slug)
    if entry is None:
        return None
    group, code, title, context, marks = entry
    return {
        "group": group, "groupTitle": PROJECT_GROUPS[group],
        "code": code, "title": title, "context": context,
        "marks": [{"code": mark, "title": DRAWING_MARKS[mark]} for mark in marks],
    }


# Order known systems within a discipline without renaming or moving records.
SYSTEM_ORDER = {
    "constructive": ("concrete-structures", "metall", "wood-based-panel-materials"),
    "eom": ("indoor-lighting", "electrical-equipment", "outdoor-lighting", "transformer-and-distribution-substations"),
    "water": ("water-supply", "water-treatment", "sanitary-equipment", "wastewater-and-drainage", "stormwater-treatment-facilities", "external-water-and-sewer-networks"),
    "hvac": ("heating-radiators", "air-ventilation", "air-conditioning", "teplovye-seti", "individual-heat-substation", "teplovye-zavesy"),
}
