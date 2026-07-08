# -*- coding: utf-8 -*-
import os
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

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

DOCX_PATH = OUT_DIR / "PNP_site_manager_navigation_20260707.docx"
MD_PATH = OUT_DIR / "PNP_site_manager_navigation_20260707.md"


def get_stats():
    return {
        "blocks": CatalogBlock.objects.count(),
        "directions": Direction.objects.count(),
        "systems": CatalogSystem.objects.count(),
        "groups": ProductGroup.objects.count(),
        "types": ProductType.objects.count(),
        "vendors": Vendor.objects.count(),
        "partners": Partner.objects.count(),
    }


PAGE_ROWS = [
    [
        "/",
        "Главная страница",
        "Первое позиционирование ПНП: единый центр комплектации строительных объектов. "
        "Клиент видит ключевой оффер, преимущества, основные направления поставки, "
        "популярные бренды и быстрый переход к заявке.",
        "Использовать как короткую презентацию компании: ПНП закрывает объект комплексно, "
        "по разделам проекта, с подбором материалов, оборудования, производителей и аналогов.",
    ],
    [
        "/about/",
        "О компании",
        "Объясняет подход ПНП: работа с задачами объекта от ТЗ и спецификации до подбора, "
        "документов, КП и поставки. Есть блоки для проектировщиков, генподрядчиков "
        "и проектных институтов.",
        "Отправлять клиенту, если нужно объяснить не конкретный товар, а ценность комплексной "
        "комплектации и роль ПНП в проекте.",
    ],
    [
        "/catalog/",
        "Каталог решений",
        "Основная карта направлений: 5 глобальных блоков, направления, системы, товарные группы "
        "и типы продукции. Клиент может проваливаться от крупного блока до конкретной товарной группы.",
        "Использовать для навигации по потребности клиента: сначала определить блок, затем направление, "
        "систему и товарную группу.",
    ],
    [
        "/catalog/<block>/",
        "Страница блока каталога",
        "Показывает направления внутри выбранного блока: например, в строительных материалах клиент "
        "видит архитектурные решения, конструктивные решения и благоустройство.",
        "Хорошая точка входа, если клиент говорит широко: нужны строительные материалы, инженерное "
        "оборудование, IT, энергетика или технологическое оборудование.",
    ],
    [
        "/catalog/<block>/<direction>/",
        "Страница направления",
        "Показывает системы внутри направления. Например: фасады, потолки, стены, окна; "
        "или ВК, ОВиК, пожарная безопасность, слаботочные сети.",
        "Помогает сузить запрос до системы и не терять клиента в большом каталоге.",
    ],
    [
        "/catalog/<block>/<direction>/<system>/",
        "Страница системы",
        "Показывает товарные группы внутри системы. Здесь клиент выбирает уже близкую к закупке категорию.",
        "Использовать, когда клиент понимает раздел, но не сформулировал точную позицию.",
    ],
    [
        "/catalog/<block>/<direction>/<system>/<group>/",
        "Товарная группа",
        "Финальная страница каталога: типы продукции, характеристики, связанные производители и мини-заявка. "
        "Клиент может добавить позиции в заявку и отправить запрос.",
        "Самая полезная страница для предметного диалога: можно попросить клиента выбрать тип продукции "
        "или отправить спецификацию.",
    ],
    [
        "/vendors/",
        "Производители",
        "Справочник производителей и брендов. Есть поиск по бренду, производителю, направлению, системе "
        "или товарной группе.",
        "Открывать, когда клиент спрашивает: с какими брендами работаете, какие есть аналоги, "
        "каких производителей можно рассмотреть.",
    ],
    [
        "/partners/",
        "Партнёры и бренды",
        "Витрина ключевых партнёров и брендов с логотипами, поиском и переходами на официальные сайты.",
        "Использовать как имиджевую страницу: показывает, что ПНП работает с известными брендами "
        "и поставщиками.",
    ],
    [
        "/contacts/",
        "Контакты и форма заявки",
        "Форма запроса КП: имя/компания, телефон, email, направление, объект, комментарий и файлы спецификации.",
        "Главная страница для действия: если клиент готов отправить ТЗ, ведомость или список позиций, вести его сюда.",
    ],
]

MANAGER_RULES = [
    "Сайт не является интернет-магазином. Его задача — быстро объяснить компетенции ПНП "
    "и привести клиента к заявке или спецификации.",
    "Каталог помогает клиенту структурировать потребность: блок → направление → система → "
    "товарная группа → тип продукции.",
    "Финальная цель сайта — заявка: спецификация, список позиций, файл, город/объект, сроки "
    "и контактные данные.",
    "Производители на сайте нужны как ориентир по брендам и аналогам. Наличие, цена, сроки "
    "и официальные документы подтверждаются менеджером.",
    "Если клиент не нашёл нужную позицию, это не отказ. Нужно предложить отправить спецификацию "
    "или описание задачи через форму.",
]

SCENARIOS = [
    [
        "Клиент спрашивает, чем занимается ПНП",
        "Отправить главную страницу и/или страницу «О компании». Коротко сказать: ПНП берёт "
        "на себя комплектацию объекта по разделам проекта.",
    ],
    [
        "Клиент не знает точное название позиции",
        "Открыть каталог и пройти с ним по уровням: блок, направление, система, товарная группа.",
    ],
    [
        "Клиент прислал спецификацию или ведомость",
        "Вести на страницу контактов или оформить заявку через мини-заявку. Важно получить файл, "
        "объект/город, сроки и контакт.",
    ],
    [
        "Клиент спрашивает конкретный бренд",
        "Проверить страницу производителей или партнёров. Если бренда нет, принять запрос "
        "и подобрать аналог через менеджера.",
    ],
    [
        "Клиент выбирает товарную группу",
        "На финальной странице группы можно добавить тип продукции в мини-заявку и отправить запрос.",
    ],
]


def build_markdown(stats, blocks):
    lines = [
        "# Навигация по сайту ПНП для менеджеров",
        "",
        "Цель документа — быстро объяснить менеджеру, что клиент видит на сайте, какую информацию получает и куда его вести в разговоре.",
        "",
        "## Как использовать сайт в продажах",
    ]
    lines.extend([f"- {item}" for item in MANAGER_RULES])
    lines.extend(
        [
            "",
            "## Актуальные масштабы сайта",
            f"- {stats['blocks']} блоков поставки",
            f"- {stats['directions']} направлений",
            f"- {stats['systems']} систем",
            f"- {stats['groups']} товарных групп",
            f"- {stats['types']} типов продукции",
            f"- {stats['vendors']} производителей",
            f"- {stats['partners']} партнёров/брендов",
            "",
            "## Карта страниц",
        ]
    )
    for url, name, client, manager in PAGE_ROWS:
        lines.extend(
            [
                f"### {name} — `{url}`",
                f"Что видит клиент: {client}",
                f"Как использовать менеджеру: {manager}",
                "",
            ]
        )

    lines.append("## Основная структура каталога")
    for block in blocks:
        lines.extend([f"### {block.title}", block.summary or ""])
        for direction in block.directions.all():
            systems = [system.title for system in direction.systems.all()[:8]]
            tail = " и др." if direction.systems.count() > 8 else ""
            lines.append(f"- {direction.title}: {', '.join(systems)}{tail}")
        lines.append("")

    lines.append("## Типовые сценарии")
    for title, action in SCENARIOS:
        lines.append(f"- {title}: {action}")

    lines.extend(
        [
            "",
            "## Что не обещаем с сайта",
            "- Не обещаем цену, наличие, сроки поставки, сертификаты или официальное представительство до проверки менеджером.",
            "- Не говорим, что список производителей окончательный: сайт помогает собрать запрос, а менеджер уточняет решение под объект.",
            "- Если позиция отсутствует в каталоге, принимаем задачу через форму и подбираем решение вручную.",
        ]
    )
    MD_PATH.write_text("\n".join(lines), encoding="utf-8")


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


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


def para(text="", bold=False, color=None, size=None, spacing_after=160):
    return (
        f'<w:p><w:pPr><w:spacing w:after="{spacing_after}"/></w:pPr>'
        f"{run(text, bold=bold, color=color, size=size)}</w:p>"
    )


def bullet(text):
    return (
        '<w:p><w:pPr><w:spacing w:after="80"/><w:ind w:left="360" w:hanging="180"/></w:pPr>'
        f"{run('• ')}{run(text)}</w:p>"
    )


def table(rows, widths):
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in widths)
    row_xml = []
    for row_index, row in enumerate(rows):
        cells = []
        for cell_index, cell in enumerate(row):
            fill = "22314a" if row_index == 0 else "ffffff"
            color = "ffffff" if row_index == 0 else "111827"
            cell_paragraphs = []
            for line in str(cell).split("\n"):
                cell_paragraphs.append(
                    para(
                        line,
                        bold=row_index == 0,
                        color=color,
                        size=20 if row_index == 0 else 19,
                        spacing_after=80,
                    )
                )
            cells.append(
                '<w:tc>'
                f'<w:tcPr><w:tcW w:w="{widths[cell_index]}" w:type="dxa"/>'
                f'<w:shd w:fill="{fill}"/>'
                '<w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>'
                '<w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'
                "</w:tcPr>"
                f"{''.join(cell_paragraphs)}</w:tc>"
            )
        row_xml.append(f"<w:tr>{''.join(cells)}</w:tr>")

    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:left w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:right w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="d7dde8"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="d7dde8"/></w:tblBorders></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>{''.join(row_xml)}</w:tbl>"
    )


def build_docx(stats, blocks):
    body = [
        para("Навигация по сайту ПНП для менеджеров", bold=True, color="0f1f36", size=36, spacing_after=220),
        para(
            "Документ помогает быстро понять, что клиент видит на сайте, какую информацию получает и куда его вести в разговоре.",
            size=22,
            spacing_after=220,
        ),
        para(
            "Коротко: сайт показывает ПНП как единый центр комплектации строительных объектов и переводит клиента к заявке, спецификации или подбору решения.",
            bold=True,
            color="a21d4b",
            size=24,
            spacing_after=260,
        ),
        para("1. Как менеджеру использовать сайт", bold=True, color="0f1f36", size=28, spacing_after=120),
    ]
    body.extend(bullet(item) for item in MANAGER_RULES)

    body.append(para("2. Актуальные масштабы сайта", bold=True, color="0f1f36", size=28, spacing_after=120))
    body.append(
        table(
            [
                ["Показатель", "Значение"],
                ["Блоки поставки", stats["blocks"]],
                ["Направления", stats["directions"]],
                ["Системы", stats["systems"]],
                ["Товарные группы", stats["groups"]],
                ["Типы продукции", stats["types"]],
                ["Производители", stats["vendors"]],
                ["Партнёры/бренды", stats["partners"]],
            ],
            widths=[4500, 2500],
        )
    )
    body.append(para("", spacing_after=120))

    body.append(para("3. Карта страниц сайта", bold=True, color="0f1f36", size=28, spacing_after=120))
    body.append(table([["URL", "Страница", "Что клиент узнаёт", "Как использовать менеджеру"], *PAGE_ROWS], widths=[1700, 2200, 4200, 4200]))
    body.append(para("", spacing_after=120))

    body.append(para("4. Структура каталога", bold=True, color="0f1f36", size=28, spacing_after=120))
    body.append(
        para(
            "Каталог устроен по цепочке: блок → направление → система → товарная группа → тип продукции → производители.",
            size=21,
            spacing_after=140,
        )
    )
    for block in blocks:
        body.append(para(block.title, bold=True, color="a21d4b", size=24, spacing_after=80))
        if block.summary:
            body.append(para(block.summary, size=20, spacing_after=80))
        for direction in block.directions.all():
            systems = [system.title for system in direction.systems.all()[:8]]
            tail = " и другие системы" if direction.systems.count() > 8 else ""
            body.append(bullet(f"{direction.title}: {', '.join(systems)}{tail}"))
        body.append(para("", spacing_after=80))

    body.append(para("5. Типовые сценарии разговора", bold=True, color="0f1f36", size=28, spacing_after=120))
    body.append(table([["Ситуация клиента", "Что делает менеджер"], *SCENARIOS], widths=[4200, 7600]))
    body.append(para("", spacing_after=120))

    body.append(para("6. Важные ограничения", bold=True, color="0f1f36", size=28, spacing_after=120))
    for item in [
        "Сайт помогает собрать и структурировать запрос, но финальную цену, наличие, сроки, сертификаты и документы подтверждает менеджер.",
        "Если клиент не нашёл нужную позицию в каталоге, это не отказ: нужно принять спецификацию или описание задачи через форму.",
        "Производители и партнёры на сайте — ориентир для подбора и доверия. Конкретное решение подбирается под объект, бюджет, сроки и требования проекта.",
    ]:
        body.append(bullet(item))

    section_props = (
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="900" w:right="720" w:bottom="900" w:left="720" w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
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
    stats = get_stats()
    blocks = list(CatalogBlock.objects.prefetch_related("directions__systems").order_by("sort_order", "title"))
    build_markdown(stats, blocks)
    build_docx(stats, blocks)
    print(DOCX_PATH)
    print(MD_PATH)


if __name__ == "__main__":
    main()
