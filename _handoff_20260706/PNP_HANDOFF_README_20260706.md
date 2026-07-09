# PNP handoff: закрытие локальных хвостов

Дата подготовки: 2026-07-06

## Как применить

1. Распаковать архив поверх корня проекта `C:\PNP1`.
2. В корне проекта выполнить:

```powershell
npm.cmd run build:catalog-vendors
npm.cmd run sync:embedded
npm.cmd run qa
npm.cmd run check:refs
```

Если нужен полный контроль перед деплоем:

```powershell
npm.cmd run preflight
```

## Что внутри

- `data/vendors_master.csv` — исправлены безопасные vendor-хвосты:
  - исправлены две мусорные кабельные строки на `Камский кабель` и `Компания «Рыбинсккабель`;
  - `ООО «Сергиево-Посадский кирпичный завод»` переведен в `confirmed_by_user` по официальному сайту, без логотипа.
- `tools/build-catalog-vendor-map.py` — добавлены точечные `VENDOR_SLUG_TO_GROUP_IDS` только для проверенных official-source строк.
- `data/catalog_product_group_images.json` и новые `.webp` — закрыты хвосты фотокарточек.
- `data/catalog_vendor_map.*`, `assets/js/data.js`, `assets/js/app.js` — generated данные после штатного pipeline.
- `catalog*.html`, `solution*.html`, `_redirects` — публичные catalog pages после `build:catalog-master-public`.
- `reports/...` — свежие отчеты очередей и QA-контроля.

## Итоговые счетчики

- photocard queue: `0`
- vendor missing queue: `0`
- vendor manual review: `15`
- vendor mapped pending review: `4`
- total vendor manual/pending: `19`
- catalog product groups covered by vendors: `235/235`
- dedicated product images: `235/235`

## Что оставлено manual review

Оставлены только строки, которые нельзя публиковать без нового решения:

- нет точной группы в каталоге: композитная арматура, хризотилцементные листы, герметики, ДПК, ПВХ-панели, электроника, строительный инструмент;
- грязные или неоднозначные источники: выставочные строки, неочевидные vendor/type;
- 4 кирпичных завода без чистого official site/logo.

## Проверки на этой машине

Выполнено и прошло:

```powershell
npm.cmd run build:catalog-vendors
npm.cmd run sync:embedded
npm.cmd run build:catalog-master-public
npm.cmd run audit:product-images
npm.cmd run audit:vendor-coverage
npm.cmd run audit:catalog-content
npm.cmd run audit:mvp-control
npm.cmd run check:content-queues
npm.cmd run qa
npm.cmd run check:refs
```

`audit:mvp-control`: `GO WITH CONTROLS`.

## Ограничения

- Деплой не выполнялся.
- `.env` и секреты не трогались.
- Backend, Caddy, systemd не менялись.
- Embedded data в `assets/js/app.js` и `assets/js/data.js` не редактировались вручную, только через `sync:embedded`.
- SOIL/Core: Core не менялся; memory patch оставался `proposed_only`.
