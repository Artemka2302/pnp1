# -*- coding: utf-8 -*-
import os
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from main.models import (  # noqa: E402
    CatalogBlock,
    CatalogSystem,
    Direction,
    Partner,
    ProductGroup,
    ProductType,
    Vendor,
)


OUT_DIR = PROJECT_ROOT / "deliverables"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DOCX_PATH = OUT_DIR / "PNP_manager_site_content_guide_20260707.docx"
MD_PATH = OUT_DIR / "PNP_manager_site_content_guide_20260707.md"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


POSITIONING = [
    [
        "Короткая формулировка",
        "ПНП — единый центр комплектации строительных объектов: подбираем материалы, оборудование, "
        "производителей и аналоги под спецификацию, сроки и бюджет.",
    ],
    [
        "Главная польза",
        "Клиент получает не разрозненный список поставщиков, а понятный комплект под объект: позиции, "
        "аналоги, документы, сроки поставки и сопровождение заявки.",
    ],
    [
        "Что закрываем",
        "Строительные материалы, инженерное оборудование, энергетику, IT оборудование и ПО, "
        "технологическое оборудование.",
    ],
    [
        "Для кого",
        "Проектировщики, генподрядчики, проектные институты, заказчики и снабжение.",
    ],
]

PAGE_GUIDE = [
    [
        "Главная",
        "/",
        "Клиент видит, что ПНП — единый центр комплектации объекта, знакомится с основными направлениями, "
        "популярными брендами и быстрым переходом к заявке.",
        "Использовать как первое знакомство с компанией.",
    ],
    [
        "О компании",
        "/about/",
        "Клиент понимает, как ПНП работает с задачей: разбирает ТЗ, подбирает решения и аналоги, "
        "готовит документы, КП и сопровождает поставку.",
        "Отправлять, если нужно объяснить подход ПНП и ценность комплексной работы.",
    ],
    [
        "Каталог",
        "/catalog/",
        "Клиент видит структуру: блок → направление → система → товарная группа → тип продукции → производители.",
        "Использовать как карту разговора, когда клиент ещё не сформулировал точную позицию.",
    ],
    [
        "Товарная группа",
        "/catalog/...",
        "Клиент видит типы продукции, характеристики, связанных производителей и мини-заявку.",
        "Использовать для предметного запроса: выбрать тип продукции и отправить заявку.",
    ],
    [
        "Производители",
        "/vendors/",
        "Клиент видит справочник производителей и поиск по брендам, системам и товарным группам.",
        "Открывать, если клиент спрашивает про бренды, заводы, аналоги или производителей.",
    ],
    [
        "Партнёры",
        "/partners/",
        "Клиент видит витрину ключевых партнёров и брендов.",
        "Использовать как имиджевую страницу для доверия.",
    ],
    [
        "Контакты и форма заявки",
        "/contacts/",
        "Клиент может оставить контакт, выбрать направление, описать задачу и прикрепить спецификацию.",
        "Вести сюда клиента, когда он готов отправить ТЗ, ведомость или список позиций.",
    ],
]

AUDIENCE_MESSAGES = [
    [
        "Для проектировщиков",
        "Помогаем сформировать технические решения, подобрать аналоги, подготовить письма, паспорта, "
        "сертификаты и чертежи для согласований.",
    ],
    [
        "Для генподрядчиков",
        "Снижаем количество контрагентов, собираем поставку через единую точку ответственности "
        "и подстраиваем логистику под график строительства.",
    ],
    [
        "Для проектных институтов",
        "Подбираем решения с учётом качества, нормативов, стоимости владения и устойчивости эксплуатации объекта.",
    ],
    [
        "Для снабжения",
        "Помогаем быстро разобрать спецификацию, найти производителей, аналоги и подготовить основу для КП.",
    ],
]

REQUEST_CHECKLIST = [
    "Имя / компания и телефон.",
    "Город, объект, сроки или стадия проекта.",
    "Материал или оборудование: название, параметры, количество.",
    "Желаемый производитель или допустимость аналога.",
    "Спецификация, ведомость, ТЗ, чертёж, PDF/Excel/DWG/фото или архив.",
    "Ограничения: бюджет, сроки поставки, документы, сертификаты, проектные требования.",
]

COMMON_ANSWERS = [
    [
        "Чем занимается ПНП?",
        "Мы комплектуем строительные объекты по разделам проекта: подбираем материалы, оборудование, "
        "производителей и аналоги под спецификацию, сроки и бюджет.",
    ],
    [
        "Можно отправить спецификацию?",
        "Да, лучше всего отправить спецификацию, ведомость или список позиций. Так менеджер быстрее "
        "проверит состав, подберёт производителей и подготовит КП.",
    ],
    [
        "Если нужного товара нет в каталоге?",
        "Каталог помогает сориентироваться, но не ограничивает возможности. Отправьте задачу или спецификацию — "
        "мы проверим и подберём решение вручную.",
    ],
    [
        "Вы работаете с конкретным брендом?",
        "На сайте есть справочник производителей и партнёров. Если нужного бренда нет в списке, "
        "мы всё равно можем проверить поставку или предложить аналог.",
    ],
    [
        "Цена и сроки известны сразу?",
        "Финальные цены, наличие, сроки, сертификаты и документы подтверждает менеджер после проверки спецификации.",
    ],
]


def stats():
    return {
        "blocks": CatalogBlock.objects.count(),
        "directions": Direction.objects.count(),
        "systems": CatalogSystem.objects.count(),
        "groups": ProductGroup.objects.count(),
        "types": ProductType.objects.count(),
        "vendors": Vendor.objects.count(),
        "partners": Partner.objects.count(),
    }


def blocks():
    return list(
        CatalogBlock.objects.prefetch_related(
            "directions__systems__product_groups",
        ).order_by("sort_order", "title")
    )


def text_node(text):
    return f'<w:t xml:space="preserve">{escape(str(text))}</w:t>'


def run(text, bold=False, color=None, size=None):
    props = []
    if bold:
        props.append("<w:b/>")
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if size:
        props.append(f'<w:sz w:val="{size}"/>')
    rpr = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    return f"<w:r>{rpr}{text_node(text)}</w:r>"


def para(text="", bold=False, color=None, size=None, after=150):
    return (
        f'<w:p><w:pPr><w:spacing w:after="{after}"/></w:pPr>'
        f"{run(text, bold=bold, color=color, size=size)}</w:p>"
    )


def bullet(text):
    return (
        '<w:p><w:pPr><w:spacing w:after="80"/><w:ind w:left="360" w:hanging="180"/></w:pPr>'
        f"{run('• ')}{run(text)}</w:p>"
    )


def table(rows, widths):
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    trs = []
    for row_index, row in enumerate(rows):
        tcs = []
        for cell_index, cell in enumerate(row):
            fill = "22314a" if row_index == 0 else "ffffff"
            color = "ffffff" if row_index == 0 else "111827"
            paragraphs = [
                para(line, bold=row_index == 0, color=color, size=19, after=70)
                for line in str(cell).split("\n")
            ]
            tcs.append(
                "<w:tc>"
                f'<w:tcPr><w:tcW w:w="{widths[cell_index]}" w:type="dxa"/>'
                f'<w:shd w:fill="{fill}"/>'
                '<w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>'
                '<w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'
                "</w:tcPr>"
                f"{''.join(paragraphs)}</w:tc>"
            )
        trs.append(f"<w:tr>{''.join(tcs)}</w:tr>")
    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:left w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:right w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="d7dde8"/></w:tblBorders></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>"
    )


def build_markdown(site_stats, site_blocks):
    lines = [
        "# Шпаргалка менеджера по сайту ПНП",
        "",
        "Документ собран по текущему содержанию сайта. Его задача — дать менеджеру понятные формулировки, "
        "карту направлений и сценарии, которые можно использовать в разговоре с клиентом.",
        "",
        "## 1. Главное позиционирование",
    ]
    for title, content in POSITIONING:
        lines.append(f"- **{title}:** {content}")

    lines.extend(["", "## 2. Что есть на сайте"])
    lines.append(f"- {site_stats['blocks']} блоков поставки")
    lines.append(f"- {site_stats['directions']} направлений")
    lines.append(f"- {site_stats['systems']} систем")
    lines.append(f"- {site_stats['groups']} товарных групп")
    lines.append(f"- {site_stats['types']} типов продукции")
    lines.append(f"- {site_stats['vendors']} производителей")
    lines.append(f"- {site_stats['partners']} партнёров/брендов")

    lines.extend(["", "## 3. Страницы и смысл для клиента"])
    for name, url, client, manager in PAGE_GUIDE:
        lines.extend(
            [
                f"### {name} — `{url}`",
                f"- Что узнаёт клиент: {client}",
                f"- Как использовать менеджеру: {manager}",
                "",
            ]
        )

    lines.extend(["", "## 4. Каталог: что мы закрываем"])
    for block in site_blocks:
        lines.extend([f"### {block.title}", block.summary or ""])
        for direction in block.directions.all():
            systems = [system.title for system in direction.systems.all()[:10]]
            tail = " и другие системы" if direction.systems.count() > 10 else ""
            lines.append(f"- **{direction.title}:** {', '.join(systems)}{tail}")
        lines.append("")

    lines.extend(["", "## 5. Формулировки по аудиториям"])
    for audience, content in AUDIENCE_MESSAGES:
        lines.append(f"- **{audience}:** {content}")

    lines.extend(["", "## 6. Что собрать для заявки"])
    lines.extend([f"- {item}" for item in REQUEST_CHECKLIST])

    lines.extend(["", "## 7. Готовые ответы клиенту"])
    for question, answer in COMMON_ANSWERS:
        lines.append(f"- **{question}** {answer}")

    lines.extend(
        [
            "",
            "## 8. Что не обещаем без проверки",
            "- Не обещаем цену, наличие, сроки поставки, сертификаты или официальное представительство до проверки менеджером.",
            "- Не говорим, что список производителей окончательный: сайт помогает собрать запрос, а менеджер уточняет решение под объект.",
            "- Если позиция отсутствует в каталоге, принимаем задачу через форму и подбираем решение вручную.",
        ]
    )
    MD_PATH.write_text("\n".join(lines), encoding="utf-8")


def build_docx(site_stats, site_blocks):
    body = [
        para("Шпаргалка менеджера по сайту ПНП", bold=True, color="0f1f36", size=38, after=220),
        para(
            "Документ собран по текущему содержанию сайта. Он нужен, чтобы менеджер быстро понимал, "
            "что клиент видит на сайте, как объяснять ПНП и куда вести клиента для заявки.",
            size=22,
            after=220,
        ),
        para(
            "Главная мысль: ПНП — единый центр комплектации строительных объектов.",
            bold=True,
            color="a21d4b",
            size=25,
            after=260,
        ),
        para("1. Главное позиционирование", bold=True, color="0f1f36", size=29, after=120),
        table([["Тезис", "Формулировка для менеджера"], *POSITIONING], widths=[3200, 8600]),
        para("", after=120),
        para("2. Что есть на сайте", bold=True, color="0f1f36", size=29, after=120),
        table(
            [
                ["Раздел данных", "Количество"],
                ["Блоки поставки", site_stats["blocks"]],
                ["Направления", site_stats["directions"]],
                ["Системы", site_stats["systems"]],
                ["Товарные группы", site_stats["groups"]],
                ["Типы продукции", site_stats["types"]],
                ["Производители", site_stats["vendors"]],
                ["Партнёры/бренды", site_stats["partners"]],
            ],
            widths=[4700, 2500],
        ),
        para("", after=120),
        para("3. Страницы сайта: что клиент узнаёт", bold=True, color="0f1f36", size=29, after=120),
        table([["Страница", "URL", "Что узнаёт клиент", "Как использовать менеджеру"], *PAGE_GUIDE], widths=[1800, 1600, 4700, 4700]),
        para("", after=120),
        para("4. Каталог: что мы закрываем", bold=True, color="0f1f36", size=29, after=120),
        para(
            "Каталог работает как дерево: блок → направление → система → товарная группа → тип продукции → производители. "
            "Эту структуру удобно использовать в разговоре, чтобы быстро сузить запрос клиента.",
            size=21,
            after=140,
        ),
    ]

    for block in site_blocks:
        body.append(para(block.title, bold=True, color="a21d4b", size=25, after=80))
        if block.summary:
            body.append(para(block.summary, size=20, after=80))
        for direction in block.directions.all():
            systems = [system.title for system in direction.systems.all()[:10]]
            tail = " и другие системы" if direction.systems.count() > 10 else ""
            body.append(bullet(f"{direction.title}: {', '.join(systems)}{tail}"))
        body.append(para("", after=80))

    body.extend(
        [
            para("5. Формулировки по аудиториям", bold=True, color="0f1f36", size=29, after=120),
            table([["Кому", "Что говорить"], *AUDIENCE_MESSAGES], widths=[3200, 8600]),
            para("", after=120),
            para("6. Что собрать для заявки", bold=True, color="0f1f36", size=29, after=120),
        ]
    )
    body.extend(bullet(item) for item in REQUEST_CHECKLIST)
    body.extend(
        [
            para("7. Готовые ответы клиенту", bold=True, color="0f1f36", size=29, after=120),
            table([["Вопрос клиента", "Ответ"], *COMMON_ANSWERS], widths=[3500, 8200]),
            para("", after=120),
            para("8. Что не обещаем без проверки", bold=True, color="0f1f36", size=29, after=120),
        ]
    )
    for item in [
        "Не обещаем цену, наличие, сроки поставки, сертификаты или официальное представительство до проверки менеджером.",
        "Не говорим, что список производителей окончательный: сайт помогает собрать запрос, а менеджер уточняет решение под объект.",
        "Если позиция отсутствует в каталоге, принимаем задачу через форму и подбираем решение вручную.",
    ]:
        body.append(bullet(item))

    section_props = (
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="900" w:right="720" w:bottom="900" w:left="720" '
        'w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    )
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{W_NS}"><w:body>{"".join(body)}{section_props}</w:body></w:document>'
    )
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    styles = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W_NS}">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="table" w:default="1" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>
</w:styles>"""
    with zipfile.ZipFile(DOCX_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document_xml)
        archive.writestr("word/styles.xml", styles)


def main():
    site_stats = stats()
    site_blocks = blocks()
    build_markdown(site_stats, site_blocks)
    build_docx(site_stats, site_blocks)
    print(DOCX_PATH)
    print(MD_PATH)


if __name__ == "__main__":
    main()
