# PNP next content queues

Generated: 2026-07-06T17:27:32

Purpose: turn current audits into execution queues for the next content batch.

## Queue files

- Photocards: `reports\content-queues\PNP_PHOTOCARD_P0_QUEUE_CURRENT.csv`
- Vendor coverage: `reports\content-queues\PNP_VENDOR_P0_COVERAGE_QUEUE_CURRENT.csv`
- Vendor manual review: `reports\content-queues\PNP_VENDOR_MANUAL_REVIEW_QUEUE_CURRENT.csv`
- Vendor mapped pending review: `reports\content-queues\PNP_VENDOR_MAPPED_PENDING_REVIEW_CURRENT.csv`
- Vendor alias candidate review: `reports\content-queues\PNP_VENDOR_ALIAS_CANDIDATE_REVIEW_CURRENT.csv`

## Photocards

- Immediate rows: 0
- Rule: close P0/P1 before P2 because these create visible duplicate cards on public system pages.

### Top systems


## Vendor coverage

- Missing product-group mappings: 0
- Rule: use official manufacturer/source evidence only; unclear rows stay in manual review.

### P0 systems


## Manual review

- Unmapped rows in manual CSV: 15
- Mapped but not published rows: 4
- Total rows requiring decision: 19
- `source_noise_or_event`: 8
- `no_catalog_group_match`: 7

### Mapped but not published

- Rows: 4
- Rule: these rows already have a catalog destination, but cannot become public until source/logo/publish status is confirmed.

- АО «Железногорский кирпичный завод» -> Конструктивные решения / Стены / кладочные материалы / Кирпич (`official_site_not_confirmed`)
- ООО «Анастасиевский кирпичный завод» -> Конструктивные решения / Стены / кладочные материалы / Кирпич (`official_site_not_confirmed`)
- ООО «Краснодарский кирпичный завод №1» -> Конструктивные решения / Стены / кладочные материалы / Кирпич (`official_site_not_confirmed`)
- ООО «Новолеушковский завод строительных материалов» -> Конструктивные решения / Стены / кладочные материалы / Кирпич (`official_site_not_confirmed`)

## Alias candidate review

- Strict source-type candidates: 0
- Rule: this queue is not auto-published. It only highlights existing manufacturers whose `source_type` exactly matches a missing product group/type/alias.
- Risk: short abbreviations such as `КНС` can be ambiguous, so every row needs a human/catalog check before changing `TYPE_TO_GROUP_IDS`.


## Acceptance

After each batch run:

- `npm.cmd run audit:product-images`
- `npm.cmd run build:catalog-vendors` if vendor data changed
- `npm.cmd run audit:vendor-coverage`
- `npm.cmd run audit:mvp-control`
- `npm.cmd run check:refs`
- `npm.cmd run qa`

Production changed: no.
