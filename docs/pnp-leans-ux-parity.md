# PNP ← ЛЕАНС: перенос согласованной структуры и UX

Дата аудита: 2026-09-25.

## Контракт задачи

- Эталон только для чтения: `C:\LIAN\lian-site`, commit `94d40c1`.
- Целевой проект: текущая рабочая копия PNP.
- Переносится структура, компоновка, адаптив, размеры и поведение.
- Не переносятся бренд, цвета, логотип, контакты, данные и интеграции ЛЕАНС.
- Backend, URL, CRM, AI, аналитика и серверные обработчики PNP сохраняются.
- Production deployment не выполняется без отдельного разрешения.

## Сравнительный аудит

| Блок ЛЕАНС | Соответствующий блок PNP | Что переносится | Что сохраняется от PNP | Файлы PNP | Риски и контроль |
| --- | --- | --- | --- | --- | --- |
| Общий header | `.topbar`, `#mainNav`, contact toggle, `#menuBtn` | Единая мобильная геометрия, 44 px touch-зоны, выравнивание logo/actions, непрозрачное меню, безопасная высота | Белый логотип PNP, navy/burgundy палитра, текущие пункты и способы связи | `templates/base.html`, новый parity CSS, `static/js/site.js` только при необходимости | Не разорвать AI/manager handlers; menu/contact должны взаимно закрываться |
| Mobile hero главной | `#top-mobile` | Четыре управляемые строки H1, высота в рабочий экран, плотные CTA и безопасные отступы | Фото PNP, тексты PNP, кнопки и маршруты PNP | `templates/main/home.html`, parity CSS | Длинная третья строка, 360 px; CTA должны оставаться в hero |
| Главная: аудитории | `#clients` | Внутренний inset, компактные строки, одинаковая высота и плотность | Иконки, роли и тексты PNP | parity CSS | Не вернуть горизонтальную карусель/обрезание текста |
| Главная: комплектация | shared direction gallery | Двухколоночная мобильная сетка, компактные фото-карточки | 14 направлений PNP, изображения и ссылки | parity CSS | Русские названия не должны делиться по одной букве |
| Главная: бренды | `.home-brand-filter-tabs`, carousel | Сетка фильтров 2+1, независимые карточки, компактная карусель | Логотипы PNP, категории и autoplay/controller | `templates/main/home.html`, parity CSS | Не менять data/ARIA hooks и автоматику |
| Главная: workflow | `#homeRequest` | Табы 2×2, компактная фото-панель, ясные route cards, без декоративных стрелок | Четыре этапа, изображения, тексты и JS PNP | `templates/main/home.html`, parity CSS | Проверить ручное и автоматическое переключение |
| Каталог: индекс | `.catalog-v2-index` | Один мобильный раскрывающийся control, закрытие вне блока/Escape/при поиске | Дерево, URL и lazy API PNP | `templates/main/catalog.html`, `static/js/catalog-desktop-v2.js`, parity CSS | Сохранить back/history и выбранный узел |
| Каталог: карточки | direction/system/product grids | Два столбца на mobile, компактные высоты и balanced text | Полные данные, фото, ссылки, request storage | `static/css/catalog-desktop-v2.css`, parity CSS | Не обрезать длинные названия; touch target ≥44 px |
| Производители: hero | `.vendors-hero` | Общий мобильный hero и управляемые строки заголовка | Текст, статистика и CTA PNP | `templates/main/vendors.html`, parity CSS | Desktop hero не должен измениться |
| Производители: направления | `.vendor-direction-grid` | Фото-карточки, мобильный порядок, компактный CTA | 14 направлений, фото и URL PNP | `templates/main/vendors.html`, parity CSS | Не менять данные/логотипы; градиент только PNP |
| Производители: фильтры | `.vendor-filter-form` | Поиск с отдельной кнопкой; advanced filters раскрываются на mobile; Escape/outside-safe UX | Все поля, query-параметры и AJAX PNP | `templates/main/vendors.html`, `static/js/site.js`, parity CSS | Фильтры должны закрываться после submit без потери значений |
| Производители: результаты | `#vendorRows`, vendor rows | Одноколоночные компактные строки и короткая mobile-подпись действия | Группы, бренды, логотипы и ссылки PNP | `templates/main/partials/vendor_rows.html`, parity CSS | Не скрывать производителей и состояние empty |
| Партнёры | partners hero/results/filter | Общий мобильный hero, CTA, сетка и отступы | Партнёры/логотипы/фильтры PNP | `templates/main/partners.html`, parity CSS | Проверить official-logo visibility и фильтрацию |
| Контакты | contacts hero + `#request-form` | Управляемый mobile hero, два CTA, компактные tabs/fields/upload/consent | Телефон, email, адрес, endpoints и формы PNP | `templates/main/contacts.html`, parity CSS | Не отправлять тестовый lead; проверить только client-side states |
| About | shared about hero | Переносы заголовка и мобильная высота как у ЛЕАНС | Название/тексты/метрики PNP | `templates/main/partials/about_hero.html`, parity CSS | Не переносить упоминания ЛЕАНС |
| Footer | `.site-footer` | Мобильная компоновка, размеры CTA, accordions, отсутствие стрелки у partner CTA | PNP logo, контакты, legal links и AI buttons | `templates/base.html`, parity CSS | Аккордеоны и AI/manager actions должны работать |
| Support/AI/chat | `.support-chat-*` | Только размеры, безопасные gutters и мобильная компоновка | AI, Bitrix, Telegram/MAX логика и тексты PNP | parity CSS; JS не менять без доказанной необходимости | Не отключить каналы PNP и не изменить lead source |
| Cookie/legal | cookie panel, privacy links | Компактное мобильное размещение и touch controls | Тексты, версии согласия, analytics consent PNP | parity CSS | Не закрывать header/hero и не менять consent API |

## Файлы эталона, которые нельзя копировать буквально

- `static/css/leans-brand.css`: используется как источник геометрии и UX, но
  его LEANS-токены, blueprint-фоны, логотип и brand selectors не переносятся.
- `main/site_config.py`, `main/context_processors.py`, `main/compliance.py`:
  содержат контакты/legal ЛЕАНС и не используются.
- `static/assets/img/leans/*`: не используются.
- Messenger gating ЛЕАНС в `templates/base.html` и `static/js/site.js`: не
  используется, потому что PNP обязан сохранить текущие каналы и AI.
- Deployment, README, business cards, privacy content и тесты бренда ЛЕАНС не
  переносятся.

## План реализации

### Этап 1. Общая мобильная сетка, шапка и меню

- Добавить отдельный последний scoped stylesheet PNP UX parity.
- Перенести измерения и responsive behavior header/menu/contact dropdown.
- Распространить утверждённую шапку главной на внутренние страницы.
- Проверить 360/390/430/543/768 и desktop 1440, меню, contact и Escape.

### Этап 2. Главная страница

- Перенести line-control mobile hero, плотность секций, audience cards,
  directions 2-column grid, brand tabs, workflow и форму.
- Удалить декоративные стрелки из видимых CTA без изменения ссылок.
- Проверить autoplay и ручные состояния.

### Этап 3. Каталог

- Перенести mobile index control и его JS-contract.
- Включить двухколоночные direction/system grids и компактные карточки.
- Проверить поиск, дерево, back/history, выбор позиций и request counter.

### Этап 4. Производители и партнёры

- Перенести common mobile hero и action layout.
- Добавить mobile advanced-filters disclosure производителям.
- Перенести компактные result rows и mobile CTA labels.
- Проверить фильтры, ссылки, логотипы и empty states.

### Этап 5. Контакты и формы

- Перенести mobile hero/actions и геометрию обеих форм.
- Проверить tabs, required states, upload chips, consent и success/error UI без
  реальной отправки в CRM.

### Этап 6. Footer и общие компоненты

- Перенести компоновку CTA/accordion/footer, support, cookie и legal surfaces.
- Сохранить все PNP action hooks и внешние каналы.

### Этап 7. Итоговая проверка

- Сравнить ЛЕАНС и PNP на одинаковых ширинах 360, 390, 430, 543, 768 и 1440.
- Сохранить парные screenshots для главной, каталога, производителей,
  партнёров, контактов, menu/footer/forms/search/filter states.
- Запустить Django/JS/diff checks и доступные project preflight-команды.
- Production не публиковать.

## Статус

- Аудит: завершён.
- План: зафиксирован.
- Этап 1, общая мобильная сетка, шапка и меню: завершён.
- Этап 2, главная страница: завершён.
- Этап 3, каталог: завершён.
- Этап 4, производители и партнёры: завершён.
- Этап 5, контакты и формы: завершён.
- Этап 6, footer и общие компоненты: завершён.
- Этап 7, итоговая проверка: завершён.

## Реализация и контроль

- Структурный слой подключён последним и только до `1080px`; desktop `1440px`
  сохраняет текущую PNP-композицию.
- Цвета, фото, логотип, шрифты, контакты, тексты и данные остаются PNP.
- Backend, маршруты, CRM, Telegram, AI, аналитика и consent API не изменялись.
- Проверены размеры `360×800`, `390×844`, `430×932`, `543×1020`,
  `768×1024` и `1440×900`.
- Парные screenshots ЛЕАНС/PNP сохранены в
  `reports/pnp-leans-parity/`; отчёт — `report.json`.
- Автоматический визуальный аудит: без horizontal overflow, обрезанных
  интерактивов, битых изображений и runtime-ошибок.
- Проверены open/close состояния menu, contact dropdown, catalog index и
  vendor filters.
- `python manage.py test`: 48 тестов, успешно.
- `python manage.py check`: успешно.
- `git diff --check` и `node --check` изменённых JS: успешно.
- Локального `package.json` и project scripts `preflight/qa/check:refs/visual:smoke`
  в PNP нет; вместо них выполнены Django checks и специализированный
  `tools/pnp_leans_parity_audit.cjs`.
