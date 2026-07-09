# PNP RKN technical implementation report

Дата: 2026-07-08

Статус: GO WITH CONTROLS / MANUAL REVIEW

## Что реализовано технически

- Добавлены публичные страницы:
  - `/privacy/`
  - `/consent/`
- Добавлен cookie-баннер при первом посещении:
  - `Принять`
  - `Отклонить необязательные`
  - выбор сохраняется в `localStorage` и отправляется в backend-журнал.
- Добавлены модели журналов:
  - `ConsentLog`
  - `CookieConsentLog`
- При отправке заявки теперь сохраняются:
  - `consent_id`
  - `lead_id/request_id`
  - `form_type`
  - `consent_version`
  - `privacy_version`
  - `timestamp`
  - `page_url`
  - `ip`
  - `user_agent`
  - `checkbox_value`
  - `file_upload_fact`
  - `submitted_fields_hash`
- Формы сайта не проходят без чекбокса согласия.
- Чекбоксы не предзаполнены.
- Возле загрузки файлов добавлен запретительный текст:
  - не загружать паспорта;
  - медицинские данные;
  - биометрию;
  - чужие ПДн без законного основания.
- Добавлена команда фактической очистки старых файлов:
  - `python manage.py cleanup_uploaded_files --dry-run`
  - `python manage.py cleanup_uploaded_files`
- Срок хранения upload-файлов в текущей технической редакции: 30 дней.
- Хвосты из `PNP_TAILS_HANDOFF_20260706.zip` применены в Django-источники:
  - `data_import/vendors_master.csv`
  - `data_import/catalog_vendor_map.csv`
  - `data_import/catalog_product_group_images.json`
  - assets изображений/логотипов в `static/assets/img`.

## Фактические сервисы в текущем Django-коде

- Сайт/backend: Django.
- База: SQLite локально, PostgreSQL поддержан через env.
- Файлы: локальное Django-хранилище `media/lead_uploads`.
- CRM/Bitrix: активная отправка не реализована в текущем Django-коде; подготовлено поле `bitrix_lead_id`.
- AI/OCR: активных вызовов не найдено.
- Telegram: активной отправки ПДн не найдено.
- Веб-аналитика: активных счетчиков в текущих Django-шаблонах не найдено.

## Что проверено локально

- `python manage.py check` — OK.
- `python manage.py test` — OK, 7 тестов.
- `python manage.py cleanup_uploaded_files --dry-run` — OK.
- `python manage.py import_pnp_data` — OK:
  - 5 блоков;
  - 14 направлений;
  - 88 систем;
  - 235 товарных групп;
  - 388 производителей;
  - 796 связей производитель -> товарная группа;
  - 0 skipped.
- ORM-аудит:
  - товарных групп без производителей: 0;
  - товарных групп без изображения: 0.
- Browser smoke через Chrome:
  - `/`
  - `/contacts/`
  - `/privacy/`
  - `/consent/`
  - product-group page
  - `/vendors/`
- Скриншоты и результат smoke:
  - `reports/rkn-smoke-20260708/`
- Консоль: ошибок нет.

## Ограничения и риски

- Это техническая редакция документов. Юрист должен проверить формулировки перед финальным юридическим утверждением.
- Автоудаление файлов реализовано командой, но на production нужно подключить регламентный запуск через cron/systemd timer.
- В текущем Django-коде публичные ссылки на upload-файлы не генерируются. Если на production будет включена публичная раздача `/media/`, её нужно закрыть или заменить на защищённые временные ссылки.
- Если будут подключены Bitrix, AI, OCR, Telegram, аналитика или внешнее облачное хранилище, нужно заново актуализировать `/privacy/`, `/consent/` и список получателей данных.
- Если данные будут уходить за пределы РФ, нужен отдельный юридический блок по трансграничной передаче.

## РКН: что должен сделать владелец/юрист

- Проверить реестр операторов РКН по ИНН.
- Если уведомления нет, подать уведомление через портал:
  - https://pd.rkn.gov.ru/operators-registry/notification/
- Если есть трансграничная передача, отдельно проверить форму:
  - https://pd.rkn.gov.ru/cross-border-transmission/form2/

## Production

Production deploy должен выполняться после локальной проверки и резервной копии текущего состояния сервера.
