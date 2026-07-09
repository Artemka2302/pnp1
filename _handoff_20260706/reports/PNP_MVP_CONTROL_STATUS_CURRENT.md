# PNP MVP control status

Дата: 2026-07-06T17:28:13
Статус: GO WITH CONTROLS

## Каталог

- Глобальных блоков: 5
- Направлений всего: 14
- Публичных направлений: 12
- Систем: 88
- Товарных групп: 235
- Товарных групп в draft: 132

## Фотокарточки

- С отдельной фотокарточкой: 235
- Без отдельной фотокарточки: 0
- Систем с видимыми дублями: 0

## Производители

- Производителей в базе: 388
- Опубликованных связей каталог -> производитель: 792
- Товарных групп с производителями: 235
- Товарных групп без производителей: 0
- Строк без уверенной привязки на ручную проверку: 15
- Сматченных, но не опубликованных строк: 4
- Всего строк, требующих решения: 19

### Без производителей по блокам


## Партнеры

- Партнеров: 76
- Featured partners: 15

## Рабочие отчеты

- `photocard_todo`: `reports/photo-card-audit/PNP_PHOTOCARD_TODO_NAMES_CURRENT.md`
- `photocard_brief`: `reports/photo-card-audit/PNP_PRODUCT_GROUP_PHOTOCARD_GENERATION_BRIEF_20260624.md`
- `vendor_gaps`: `reports/vendor-catalog-map/PNP_VENDOR_COVERAGE_GAPS_CURRENT.md`
- `vendor_manual_review`: `reports/vendor-catalog-map/PNP_VENDOR_MANUAL_REVIEW_CURRENT.md`

## Риски до идеального MVP

- 19 строк производителей требуют ручного решения или подтверждения публикации

## Следующий безопасный шаг

1. Импортировать новый архив фотокарточек через dry-run.
2. Закрывать производителей по отчету `vendor_gaps`, не публикуя строки из manual review без проверки.
3. После каждой партии запускать `build:catalog-vendors`, `audit:mvp-control`, `qa`, `check:refs`.
