# PNP / Django Handoff For Next Codex

Дата фиксации: 2026-07-07  
Рабочий проект: `C:\PNP1\pnp1`  
Текущий фокус: перенос сайта ПНП из большого статического HTML/JS в нормальный Django/ORM-проект для дальнейшей разработки backend/API.

## Короткий промпт для нового Codex

Ты подключаешься к проекту ПНП. Работай как автономный инженер, но сначала прочитай этот файл полностью.

Главное: это не макет и не демо, а бизнес-система для сайта ПНП. Данные каталога, производители, партнёры, картинки, логотипы, AI-заявка, Bitrix и будущий backend должны быть согласованы. Не возвращай проект к 100+ статическим HTML-страницам и не придумывай бренды/логотипы.

Первое действие:

```powershell
cd C:\PNP1\pnp1
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8010
```

Потом открыть:

```text
http://127.0.0.1:8010/
http://127.0.0.1:8010/catalog/
http://127.0.0.1:8010/vendors/
http://127.0.0.1:8010/partners/
```

## Council-3 статус

Статус: `GO WITH CONTROLS`.

Benefit / директор:
- Проект уже приведён к нормальной Django-структуре: ORM-модели, импорт данных, компактные templates, CSS/JS отдельно.
- Разработчик может продолжать backend на Django, не разбирая огромный статический сайт вручную.

Risk / аудитор:
- GitHub push пока заблокирован правами: текущий аккаунт `azazzka52` не имеет push-доступа к `Artemka2302/pnp1`.
- `db.sqlite3` сейчас есть в рабочей папке и может быть отслеживаемым Git. Для чистой передачи лучше полагаться на migrations + `data_import`, а не на ручной перенос SQLite.
- Это Django MVP витрины. AI-чат, Bitrix API, upload, Telegram workflow и production Node backend из старого проекта сюда ещё не переписаны.

Practice / исполнитель:
- Проверять через `manage.py check`, smoke URL, браузер.
- После изменений данных запускать импорт из `data_import`.
- Перед передачей разработчику сделать чистый commit после настройки Git-доступа.

## Что уже сделано в Django

Проект `C:\PNP1\pnp1` содержит:

- Django app `main`.
- ORM-модели:
  - `CatalogBlock`
  - `Direction`
  - `CatalogSystem`
  - `ProductGroup`
  - `ProductType`
  - `ProductAttribute`
  - `Vendor`
  - `VendorProductGroup`
  - `Partner`
- Команда импорта:
  - `main/management/commands/import_pnp_data.py`
- Seed-данные:
  - `data_import/catalog_master.json`
  - `data_import/catalog_product_group_images.json`
  - `data_import/vendors_master.csv`
  - `data_import/catalog_vendor_map.csv`
  - `data_import/partners.json`
  - `data_import/featured_partners.json`
- Templates:
  - `templates/base.html`
  - `templates/main/home.html`
  - `templates/main/catalog.html`
  - `templates/main/catalog_level.html`
  - `templates/main/product_group.html`
  - `templates/main/vendors.html`
  - `templates/main/partners.html`
  - `templates/main/simple_page.html`
- Static:
  - `static/css/site.css`
  - `static/js/site.js`
  - `static/assets/img/**`

Удалён подход “просто переложить все HTML как есть”. Старые большие pages заменены динамическими страницами через ORM.

## Текущие маршруты

Нормальные маршруты:

```text
/
/about/
/contacts/
/catalog/
/catalog/<block_slug>/
/catalog/<block_slug>/<direction_slug>/
/catalog/<block_slug>/<direction_slug>/<system_slug>/
/catalog/<block_slug>/<direction_slug>/<system_slug>/<group_slug>/
/vendors/
/partners/
```

Старые `solution-...` и `catalog-...` URL не хранят отдельные HTML. Они редиректятся на новые динамические URL.

Также добавлена совместимость для старых asset-ссылок:

```text
/assets/... -> /static/assets/...
```

Это нужно, потому что в старых логах были 404 по `/assets/img/...`, хотя физически файлы уже лежат в `static/assets/img/...`.

## Проверки, которые уже проходили

Команда:

```powershell
.\.venv\Scripts\python.exe manage.py check
```

Статус: OK.

Smoke через Django client:

```text
/ -> 200
/catalog/ -> 200
/catalog/building-materials/ -> 200
/catalog/building-materials/constructive/ -> 200
/catalog/building-materials/constructive/wood-based-panel-materials/ -> 200
/catalog/building-materials/constructive/wood-based-panel-materials/plywood/ -> 200
/vendors/?q=kaspersky -> 200
/partners/ -> 200
/solution-constructive-wood-based-panel-materials -> 302
/assets/img/logos/partners/prado.webp -> 302 -> /static/assets/img/logos/partners/prado.webp -> 200
```

## Как пересобрать базу

Если база пустая или переносится на другой компьютер:

```powershell
cd C:\PNP1\pnp1
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py import_pnp_data
```

Ожидаемые объёмы после импорта ориентировочно:

```text
catalog_blocks: 5
catalog_directions: 14
catalog_systems: 88
catalog_product_groups: 235
catalog_product_types: 862
catalog_attributes: 1640
vendors: 388
vendor_product_links: 744
partners: 76
```

## Почему нужен `data_import`

`data_import` — это не backend-логика и не публичная статика. Это нормальный источник первичной загрузки данных.

Зачем он нужен:

- быстро восстановить SQLite или PostgreSQL из проверенных CSV/JSON;
- не хранить весь каталог в 100+ HTML;
- дать разработчику прозрачную точку входа в данные;
- в будущем заменить CSV/JSON на админку, API или интеграцию с Bitrix без переписывания templates.

Без `data_import` проект будет зависеть от случайной локальной `db.sqlite3`, что плохо для команды.

## Переезд на PostgreSQL

PostgreSQL на текущем компьютере не обязателен для разработки MVP. Можно работать на SQLite.

Для переезда:

1. Поставить PostgreSQL на нужном сервере/компьютере.
2. Настроить `DATABASES` в `config/settings.py` через env.
3. Запустить:

```powershell
python manage.py migrate
python manage.py import_pnp_data
```

Такой путь проще и чище, чем переносить SQLite dump.

## GitHub состояние

Remote:

```text
origin https://github.com/Artemka2302/pnp1.git
```

Локально настроен author:

```text
PNP Codex <codex@pnp.local>
```

Блокер:

```text
remote: Permission to Artemka2302/pnp1.git denied to azazzka52.
fatal: The requested URL returned error: 403
```

Что нужно:

- добавить GitHub-аккаунт `azazzka52` как collaborator в `Artemka2302/pnp1`;
- или залогиниться в Git под аккаунтом `Artemka2302`;
- или дать токен с правом push в этот repo.

До решения прав можно делать локальные commits, но push не пройдёт.

## Правила продукта ПНП, которые важно сохранить

### 1. Актуальность данных

Если добавляется производитель, он должен пройти весь контур:

- карточки товарных групп;
- страница производителей;
- партнёры/логотипы, если это партнёр;
- фильтры;
- счётчики;
- поиск;
- AI knowledge / CRM mapping позже;
- визуальная проверка desktop/mobile.

Нельзя добавлять поставщика только в одно место.

### 2. Каталог

Принятая структура:

```text
Глобальный блок
  -> Направление
    -> Система
      -> Товарная группа / материал
        -> Тип продукции
          -> Характеристики
            -> Бренды / поставщики / документы / CRM / AI
```

Основные глобальные блоки:

- Строительные материалы
- Инженерное оборудование
- Энергетика
- IT оборудование и ПО
- ТХ оборудование

### 3. Производители и логотипы

Только официальные источники или предоставленные файлы.

Нельзя:

- придумывать бренды;
- брать логотипы с маркетплейсов, PNGWing, Pinterest, случайных сайтов;
- оставлять белый логотип на белом фоне;
- мешать названия и логотипы в карточках без единого правила;
- оставлять кропнутые фоны и скриншотные прямоугольники.

Текущая логика: в карточках производителей предпочтительно показывать нормализованный логотип без лишнего текстового дубля, если логотип читаемый.

### 4. Визуальный стандарт

Всегда проверять desktop и mobile.

Типовые дефекты, которые уже много раз всплывали:

- текст слишком близко к краю карточки;
- обрезанные слова;
- кнопки вылезают;
- логотипы разного размера;
- карточки-дубли с одной картинкой;
- слишком много розового акцента;
- непонятная иерархия каталога;
- mobile выглядит хуже desktop.

### 5. AI / Bitrix

В старом production-сайте AI-чат был lead-каналом.

Правильная бизнес-логика:

- клиент оставляет контакт;
- AI собирает заявку;
- файл/спецификация прикрепляется;
- создаётся/обновляется один лид в Bitrix;
- кнопка “Позвать менеджера” открывает настоящий Bitrix livechat;
- AI-чат не должен имитировать чужой livechat.

В Django-проект это ещё не перенесено. Это следующий backend-этап.

## Что не делать новому Codex

- Не возвращать 122 статические HTML-страницы.
- Не держать каталог в одном гигантском JS.
- Не писать backend-данные руками в templates.
- Не включать Django admin без отдельного решения пользователя.
- Не деплоить production без явного разрешения.
- Не менять production `pnp1.ru`, Caddy, systemd, DNS без отдельной команды.
- Не пушить секреты, `.env`, токены, реальные приватные ключи.

## Следующие правильные шаги

1. Проверить текущий Django-проект локально:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8010
```

2. Привести Git к чистой передаче:
   - убедиться, что `.env` пустой и не содержит секретов;
   - решить, нужно ли убирать `db.sqlite3` из Git и восстанавливать через import;
   - получить права push в `Artemka2302/pnp1`;
   - сделать commit.

3. Дальше backend:
   - вынести настройки БД в env;
   - подготовить PostgreSQL-конфиг;
   - добавить модели заявок: `Lead`, `LeadItem`, `UploadedFile`;
   - добавить API для catalog request / mini-request;
   - потом интеграция Bitrix.

4. Дальше frontend:
   - browser/mobile smoke;
   - улучшить поиск по каталогу на backend;
   - восстановить/перенести UX мини-заявки из каталога;
   - проверить визуальные карточки товарных групп.

## Мини-чеклист перед сдачей разработчику

```powershell
cd C:\PNP1\pnp1
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py import_pnp_data
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8010
```

Проверить в браузере:

```text
http://127.0.0.1:8010/
http://127.0.0.1:8010/catalog/
http://127.0.0.1:8010/catalog/building-materials/constructive/wood-based-panel-materials/plywood/
http://127.0.0.1:8010/vendors/?q=kaspersky
http://127.0.0.1:8010/partners/
```

Если это работает, проект можно отдавать backend-разработчику как Django/ORM MVP.

