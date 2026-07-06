# PNP Django architecture

Проект переведен из статического набора HTML/JS в Django ORM MVP.

## Что изменено

- Каталог, производители и партнеры импортируются в базу через Django ORM.
- Runtime больше не зависит от огромного `assets/js/data.js`.
- 122 статические HTML-страницы заменены на компактный набор шаблонов:
  - `templates/base.html`
  - `templates/main/home.html`
  - `templates/main/catalog.html`
  - `templates/main/catalog_level.html`
  - `templates/main/product_group.html`
  - `templates/main/vendors.html`
  - `templates/main/partners.html`
  - `templates/main/simple_page.html`
- Основная статика:
  - `static/css/site.css`
  - `static/js/site.js`
  - `static/assets/img/**`

## Данные

Исходные файлы для импорта лежат в `data_import/`:

- `catalog_master.json`
- `catalog_product_group_images.json`
- `vendors_master.csv`
- `catalog_vendor_map.csv`
- `partners.json`
- `featured_partners.json`

Импорт:

```bash
python manage.py import_pnp_data
```

Команда пересобирает данные в БД из исходников.

## Основные модели

- `CatalogBlock`
- `Direction`
- `CatalogSystem`
- `ProductGroup`
- `ProductType`
- `ProductAttribute`
- `Vendor`
- `VendorProductGroup`
- `Partner`

Связи построены через ForeignKey и ManyToMany through-модель, поэтому перенос на PostgreSQL не должен требовать переписывания бизнес-логики.

## Роуты

Новые нормальные роуты:

```text
/
/catalog/
/catalog/<block>/
/catalog/<block>/<direction>/
/catalog/<block>/<direction>/<system>/
/catalog/<block>/<direction>/<system>/<product_group>/
/vendors/
/partners/
```

Старые `solution-...` URL не держат отдельные HTML-файлы, а редиректятся на новые динамические роуты.

## Перенос на PostgreSQL

1. Подключить PostgreSQL в `settings.py` через `DATABASES`.
2. Выполнить миграции:

```bash
python manage.py migrate
```

3. Импортировать данные:

```bash
python manage.py import_pnp_data
```

Такой перенос предпочтительнее, чем `dumpdata/loaddata`, потому что база пересобирается из исходного каталожного справочника и CSV-маппинга.

## Что дальше писать разработчику

- API для заявок и AI-чата.
- Модели `Lead`, `LeadItem`, `UploadedFile`.
- Интеграцию с Bitrix.
- Нормальный backend-поиск по каталогу.
- Редактирование данных через собственные views/forms или отдельную админку, если она понадобится позже.
