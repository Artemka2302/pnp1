function qs(s, root=document){return root.querySelector(s)}
function qsa(s, root=document){return [...root.querySelectorAll(s)]}
const AI_LEAD_DRAFT_KEY = 'pnpAiLeadDraftV1';
const AI_CONTACT_KEY = 'pnpAiContactV1';
const AI_BITRIX_LEAD_KEY = 'pnpAiBitrixLeadV1';
const AI_LAST_APPLIED_COMMENT_KEY = 'pnpLastAppliedAiCommentV1';
const AI_LAST_APPLIED_OBJECT_KEY = 'pnpLastAppliedAiObjectV1';
const AI_CHAT_SIZE_KEY = 'pnpAiChatSizeV1';
const BITRIX_SITE_BUTTON_SRC = 'https://bitrix.bus-sup.ru/upload/crm/site_button/loader_1_xry75s.js';
const BITRIX_LIVECHAT_TITLE = 'Онлайн-чат ПНП';
const BITRIX_LIVECHAT_HELP_TITLE = 'Напишите вопрос по поставке';
const BITRIX_LIVECHAT_HELP_SUBTITLE = 'Напишите, что нужно на объект: материал, количество, город или вопрос по спецификации. Если вы уже заполнили AI-заявку, менеджер увидит её в Базе.';
const BITRIX_LIVECHAT_ONLINE_LINE_1 = 'Напишите вопрос по поставке';
const BITRIX_LIVECHAT_ONLINE_LINE_2 = BITRIX_LIVECHAT_HELP_SUBTITLE;
const BITRIX_LIVECHAT_PERSONAL_LINE_2 = BITRIX_LIVECHAT_HELP_SUBTITLE;
const BITRIX_LIVECHAT_OFFLINE_TEXT = 'Оставьте сообщение — менеджер вернётся с ответом по заявке.';
const BITRIX_LIVECHAT_PLACEHOLDER = 'Напишите сообщение менеджеру...';
const BITRIX_LIVECHAT_HANDOFF_TEXT = 'Передал заявку менеджеру. Открою онлайн-чат: напишите туда сообщение, чтобы диалог появился у специалиста в контакт-центре.';
const BITRIX_LIVECHAT_QUEUE_TEXT = 'Вы в очереди. Вам ответит первый освободившийся менеджер.';

function initPnpHeaderLogoRailLock(){
  const img = qs('.brand-pnp-clean-img');
  const rail = qs('.vertical-accent');
  if(!img || !rail) return;
  const LOGO_RAIL_AXIS_RATIO = 225 / 816;
  const readTranslateX = value=>{
    if(!value || value === 'none') return 0;
    const match = value.match(/^matrix(3d)?\((.+)\)$/);
    if(!match) return 0;
    const parts = match[2].split(',').map(part=>parseFloat(part.trim()));
    return match[1] ? (parts[12] || 0) : (parts[4] || 0);
  };
  let raf = 0;
  const lock = ()=>{
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const imgRect = img.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      if(!imgRect.width || !railRect.width) return;
      const currentShift = readTranslateX(getComputedStyle(img).transform);
      const imageLeftWithoutShift = imgRect.left - currentShift;
      const targetAxis = railRect.left + railRect.width / 2;
      const desiredShift = targetAxis - imageLeftWithoutShift - imgRect.width * LOGO_RAIL_AXIS_RATIO;
      document.documentElement.style.setProperty('--pnp-header-logo-axis-shift', `${desiredShift.toFixed(2)}px`);
    });
  };
  lock();
  if(!img.complete) img.addEventListener('load', lock, {once:true});
  window.addEventListener('resize', lock, {passive:true});
  window.addEventListener('orientationchange', lock, {passive:true});
  setTimeout(lock, 160);
}

const embeddedPartners = [
  {
    "id": "dkc",
    "name": "DKC",
    "slug": "dkc",
    "status": "logo_ready",
    "priority": 1,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/dkc.svg",
    "logo_source_url": "https://www.dkc.ru/ru/",
    "official_site": "https://www.dkc.ru/",
    "category": "Электрика / кабеленесущие системы",
    "note": "Ключевой бренд по кабеленесущим системам и электротехнической инфраструктуре."
  },
  {
    "id": "ekf",
    "name": "EKF",
    "slug": "ekf",
    "status": "logo_ready",
    "priority": 2,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ekf.svg",
    "logo_source_url": "https://ekfgroup.com/images/logo-ekf.svg",
    "official_site": "https://ekfgroup.com/",
    "category": "Электрика",
    "note": "Электротехническое оборудование для комплектации инженерных объектов."
  },
  {
    "id": "kabelnyy-alyans",
    "name": "Кабельный Альянс",
    "slug": "kabelnyy-alyans",
    "status": "logo_ready",
    "priority": 3,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/kabelnyy-alyans.png",
    "logo_source_url": "https://holdcable.com/images/logo.png",
    "official_site": "https://holdcable.com/",
    "category": "Электрика / кабель",
    "note": "Кабельная продукция для инженерных и строительных объектов."
  },
  {
    "id": "lsr",
    "name": "ЛСР",
    "slug": "lsr",
    "status": "logo_ready",
    "priority": 4,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/lsr.jpg",
    "logo_source_url": "https://sm.lsr.ru/local/client/img/new-logo.jpg",
    "official_site": "https://sm.lsr.ru/spb/",
    "category": "Конструктивные решения / строительные материалы",
    "note": "Строительные материалы и конструктивные решения."
  },
  {
    "id": "braer",
    "name": "BRAER",
    "slug": "braer",
    "status": "logo_ready",
    "priority": 5,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/braer.svg",
    "logo_source_url": "https://braer.ru/upload/iblock/730/kyeo84bl8yncl3asmrc0ogho3vu2u77t.svg",
    "official_site": "https://braer.ru/",
    "category": "Конструктивные решения / кирпич и мощение",
    "note": "Кирпич, керамические блоки и элементы благоустройства."
  },
  {
    "id": "rehau",
    "name": "REHAU",
    "slug": "rehau",
    "status": "logo_ready",
    "priority": 6,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/rehau.svg",
    "logo_source_url": "https://rhsolutions.ru/",
    "official_site": "https://rhsolutions.ru/",
    "category": "Инженерные системы / полимерные решения",
    "note": "Полимерные инженерные решения, трубы и системные компоненты."
  },
  {
    "id": "k-flex",
    "name": "K-FLEX",
    "slug": "k-flex",
    "status": "logo_ready",
    "priority": 7,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/k-flex.svg",
    "logo_source_url": "https://kflex.ru/markup/public/css/styles.css",
    "official_site": "https://kflex.ru/",
    "category": "Изоляция / инженерная изоляция",
    "note": "Техническая изоляция инженерных систем."
  },
  {
    "id": "korf",
    "name": "KORF",
    "slug": "korf",
    "status": "logo_ready",
    "priority": 8,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/korf.png",
    "logo_source_url": "https://po-korf.ru/assets/images/logo2.png",
    "official_site": "https://po-korf.ru/",
    "category": "ОВиК / вентиляция",
    "note": "Вентиляционное оборудование и компоненты ОВиК."
  },
  {
    "id": "wilo",
    "name": "Wilo",
    "slug": "wilo",
    "status": "logo_ready",
    "priority": 9,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/wilo.png",
    "logo_source_url": "",
    "official_site": "https://wilo.ru/",
    "category": "ВК / насосное оборудование",
    "note": "Насосное оборудование для водоснабжения, отопления и инженерных систем."
  },
  {
    "id": "uponor",
    "name": "Uponor",
    "slug": "uponor",
    "status": "logo_ready",
    "priority": 10,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/uponor-clean.png",
    "logo_source_url": "https://uponor.company/wp-content/themes/upanor-wp/images/logo.png",
    "official_site": "https://uponor.company/",
    "category": "ВК / трубопроводные системы",
    "note": "Трубопроводные системы, водоснабжение и отопление."
  },
  {
    "id": "schneider-electric",
    "name": "Schneider Electric",
    "slug": "schneider-electric",
    "status": "logo_ready",
    "priority": 11,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/schneider-electric.svg",
    "logo_source_url": "https://schneider-russia.com/uploads/images/logo-w1.svg",
    "official_site": "https://schneider-russia.com/",
    "category": "Электрика / автоматизация",
    "note": "Электрораспределение, автоматизация и управление энергией."
  },
  {
    "id": "iek",
    "name": "IEK",
    "slug": "iek",
    "status": "logo_ready",
    "priority": 12,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/iek.svg",
    "logo_source_url": "https://www.iek.ru/upload/iek.site/b44/a1tm25v7x3thqaw3ecskvvcn5yi8kwaz/logo.svg",
    "official_site": "https://www.iek.ru/",
    "category": "Электрика",
    "note": "Электротехническое оборудование для объектов строительства."
  },
  {
    "id": "tehnonikol",
    "name": "Технониколь",
    "slug": "tehnonikol",
    "status": "logo_ready",
    "priority": 13,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/technonikol-clean.png",
    "logo_source_url": "https://www.tn.ru/upload/delight.webpconverter/upload/resize_cache/iblock/c98/451_119_1/949edb715aadf20d817abeedc079ccb9.jpg.webp?17256584824098",
    "official_site": "https://www.tn.ru/",
    "category": "Кровля / гидроизоляция / теплоизоляция",
    "note": "Кровельные, гидроизоляционные и теплоизоляционные материалы."
  },
  {
    "id": "knauf",
    "name": "Кнауф",
    "slug": "knauf",
    "status": "logo_ready",
    "priority": 14,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/knauf.svg",
    "logo_source_url": "https://www.knauf.ru/local/templates/main/dist/images/header/logo.svg",
    "official_site": "https://www.knauf.ru/",
    "category": "Архитектура / сухое строительство",
    "note": "Материалы для сухого строительства и отделки."
  },
  {
    "id": "volma",
    "name": "Волма",
    "slug": "volma",
    "status": "logo_ready",
    "priority": 15,
    "show_on_home": true,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/volma.svg",
    "logo_source_url": "https://www.volma.ru/img/a-logo.svg",
    "official_site": "https://www.volma.ru/",
    "category": "Архитектура / сухие смеси",
    "note": "Сухие строительные смеси и материалы для отделки."
  },
  {
    "id": "depo-computers",
    "name": "DEPO Computers",
    "slug": "depo-computers",
    "status": "logo_ready",
    "priority": 16,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/depo-computers.png",
    "logo_source_url": "https://static.tildacdn.com/tild6264-3332-4438-a439-373663373064/Logo_DepoComputers.png",
    "official_site": "https://depo-computers.com/",
    "category": "IT-инфраструктура / серверы и рабочие станции",
    "note": "Серверы, СХД, коммутаторы, инфраструктурные компоненты, компьютеры и рабочие станции для корпоративной IT-комплектации."
  },
  {
    "id": "gyproc",
    "name": "Gyproc",
    "slug": "gyproc",
    "status": "logo_ready",
    "priority": 16,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/gyproc.png",
    "logo_source_url": "",
    "official_site": "https://www.gyproc.ru/",
    "category": "Архитектура / сухое строительство",
    "note": "Гипсовые строительные плиты и системы сухого строительства."
  },
  {
    "id": "grand-line",
    "name": "GRAND LINE",
    "slug": "grand-line",
    "status": "logo_ready",
    "priority": 17,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/grand-line.png",
    "logo_source_url": "https://www.grandline.ru/image/data/logo.png",
    "official_site": "https://www.grandline.ru/",
    "category": "Кровля / фасады / ограждения",
    "note": "Кровельные, фасадные материалы и ограждения."
  },
  {
    "id": "yadro",
    "name": "YADRO",
    "slug": "yadro",
    "status": "logo_ready",
    "priority": 17,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/yadro-on-white.svg",
    "logo_source_url": "https://yadro.com/assets/shared/svgs/logo_yadro_white_193x48.svg",
    "official_site": "https://yadro.com/",
    "category": "IT-инфраструктура / серверы, СХД, коммутаторы и ПО",
    "note": "Серверы, системы хранения данных, сетевые коммутаторы, ПО, интегрированные решения и инфраструктура ЦОД."
  },
  {
    "id": "kvadra",
    "name": "KVADRA",
    "slug": "kvadra",
    "status": "logo_ready",
    "priority": 18,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/kvadra-on-white.svg",
    "logo_source_url": "https://xn--80aaej1a3b.xn--p1ai/wp-content/themes/kvadra/assets/public/static/images/logo.svg?v2",
    "official_site": "https://квадра.рф/",
    "category": "IT-инфраструктура / корпоративные устройства",
    "note": "Корпоративные ПК, моноблоки, ноутбуки, планшеты и клиентские устройства в экосистеме YADRO."
  },
  {
    "id": "rockwool",
    "name": "ROCKWOOL",
    "slug": "rockwool",
    "status": "logo_ready",
    "priority": 18,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/rockwool.svg",
    "logo_source_url": "https://rwl.ru/local/templates/rockwool_v2/assets/images/logo/logo.svg?1752752399",
    "official_site": "https://rwl.ru/",
    "category": "Теплоизоляция",
    "note": "Каменная вата и теплоизоляционные решения."
  },
  {
    "id": "kerama-marazzi",
    "name": "KERAMA MARAZZI",
    "slug": "kerama-marazzi",
    "status": "logo_ready",
    "priority": 19,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/kerama-marazzi.png",
    "logo_source_url": "",
    "official_site": "https://kerama-marazzi.com/",
    "category": "Плитка / керамогранит",
    "note": "Керамическая плитка, керамогранит и отделочные материалы."
  },
  {
    "id": "magma",
    "name": "Магма",
    "slug": "magma",
    "status": "logo_ready",
    "priority": 20,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/magma-clean.png",
    "logo_source_url": "https://magma-td.ru/img/logo.png?v=1.0",
    "official_site": "https://magma-td.ru/catalog/gipsokartonnye-listy/gipsokarton-vlagostoykiy/",
    "category": "Архитектура / гипсокартон",
    "note": "Гипсокартонные листы и строительные материалы по указанному каталогу."
  },
  {
    "id": "unitile",
    "name": "Unitile",
    "slug": "unitile",
    "status": "logo_ready",
    "priority": 21,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/unitile.png",
    "logo_source_url": "https://unitile.ru/custom/assets/guideline/unitile-logo.zip",
    "official_site": "https://unitile.ru/partners/style_guidelines/",
    "category": "Плитка / отделочные материалы",
    "note": "Керамическая плитка, керамогранит и отделочные материалы для архитектурных и интерьерных решений."
  },
  {
    "id": "ecler",
    "name": "Ecler",
    "slug": "ecler",
    "status": "logo_ready",
    "priority": 22,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ecler.svg",
    "logo_source_url": "https://www.ecler.com/_next/static/media/logo.884da08e.svg",
    "official_site": "https://www.ecler.com/",
    "category": "Слаботочные системы / аудио",
    "note": "Профессиональное аудиооборудование для систем озвучивания, конференц-залов и общественных пространств."
  },
  {
    "id": "midea",
    "name": "MIDEA",
    "slug": "midea",
    "status": "logo_ready",
    "priority": 23,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/midea.png",
    "logo_source_url": "https://web-res.midea.com/content/dam/midea-aem/global/official/midea-logo.png/jcr%3Acontent/renditions/midea-logo.webp",
    "official_site": "https://www.midea.com/global/",
    "category": "ОВиК / климатическое оборудование",
    "note": "Климатическое оборудование, VRF-системы и инженерные решения для вентиляции и кондиционирования объектов."
  },
  {
    "id": "feron",
    "name": "FERON",
    "slug": "feron",
    "status": "logo_ready",
    "priority": 24,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/feron.png",
    "logo_source_url": "https://feron.ru/korporativnyy-stil/Feron.rar",
    "official_site": "https://feron.ru/korporativnyy-stil/",
    "category": "Электрика / освещение",
    "note": "Светотехническая и электротехническая продукция для внутреннего, наружного и декоративного освещения."
  },
  {
    "id": "itk",
    "name": "ITK",
    "slug": "itk",
    "status": "logo_ready",
    "priority": 25,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/itk.svg",
    "logo_source_url": "https://itk-group.ru/local/templates/itk-group-2025/images/logo_new-dark.svg",
    "official_site": "https://itk-group.ru/",
    "category": "Электрика / слаботочная инфраструктура",
    "note": "Кабельные системы, телекоммуникационные шкафы и решения для слаботочной инфраструктуры объектов."
  },
  {
    "id": "ledel",
    "name": "LEDEL",
    "slug": "ledel",
    "status": "logo_ready",
    "priority": 26,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ledel.svg",
    "logo_source_url": "https://ledel.ru/local/templates/ledel/images/logo.svg",
    "official_site": "https://ledel.ru/",
    "category": "Освещение",
    "note": "Промышленные и уличные светодиодные светильники для ЭОМ, складов, производств и общественных зданий."
  },
  {
    "id": "fereks",
    "name": "FEREKS",
    "slug": "fereks",
    "status": "logo_ready",
    "priority": 27,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/fereks.svg",
    "logo_source_url": "https://fereks.ru/local/templates/main/images/logo.svg",
    "official_site": "https://fereks.ru/",
    "category": "Освещение",
    "note": "Светодиодные светильники и осветительные решения для промышленных, коммерческих и инфраструктурных объектов."
  },
  {
    "id": "oni",
    "name": "ONI",
    "slug": "oni",
    "status": "logo_ready",
    "priority": 28,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/oni.svg",
    "logo_source_url": "https://oni-system.com/local/templates/oni-system-2025/images/logo_new-dark.svg",
    "official_site": "https://oni-system.com/",
    "category": "Промышленная автоматизация",
    "note": "Оборудование автоматизации и управления для инженерных систем, электроприводов и промышленных объектов."
  },
  {
    "id": "neosun",
    "name": "NEOSUN",
    "slug": "neosun",
    "status": "logo_ready",
    "priority": 29,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/neosun-clean.svg",
    "logo_source_url": "https://profesko.ru/local/templates/profesco/img/companies/neo-sun/neo-sun-active.svg",
    "official_site": "https://neosunenergy.ru/",
    "category": "Солнечная энергетика / освещение",
    "note": "Светотехнические решения и оборудование для архитектурного, коммерческого и технического освещения."
  },
  {
    "id": "masterscada",
    "name": "MasterSCADA",
    "slug": "masterscada",
    "status": "logo_ready",
    "priority": 30,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/masterscada-clean.svg",
    "logo_source_url": "https://profesko.ru/local/templates/profesco/img/companies/scada/scada-active.svg",
    "official_site": "https://iek-digital.ru/",
    "category": "Автоматизация / диспетчеризация",
    "note": "Программные решения диспетчеризации и автоматизации инженерных систем зданий и производственных объектов."
  },
  {
    "id": "profesco",
    "name": "PROFESCO",
    "slug": "profesco",
    "status": "logo_ready",
    "priority": 31,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/profesco-clean.svg",
    "logo_source_url": "https://profesko.ru/local/templates/profesco/img/companies/profesco/profesco-active.svg",
    "official_site": "https://profesko.ru/",
    "category": "Энергосервис / автоматизация",
    "note": "Инженерные решения и программно-аппаратные системы для автоматизации, диспетчеризации и управления объектами."
  },
  {
    "id": "generica",
    "name": "Generica",
    "slug": "generica",
    "status": "logo_ready",
    "priority": 32,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/generica.svg",
    "logo_source_url": "https://generica.su/local/templates/generica-redesign/images/logotype-dark.svg",
    "official_site": "https://generica.su/",
    "category": "Электротехническое оборудование",
    "note": "Электротехническая продукция и комплектующие для базовой комплектации инженерных систем объекта."
  },
  {
    "id": "ambiot",
    "name": "AMBIOT",
    "slug": "ambiot",
    "status": "logo_ready",
    "priority": 33,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ambiot.svg",
    "logo_source_url": "https://static.tildacdn.com/tild3866-3766-4535-b033-323763323063/__Header.svg",
    "official_site": "https://ambiot.io/",
    "category": "Умное освещение / IIoT",
    "note": "Системы автоматизации, мониторинга и управления инженерной инфраструктурой зданий."
  },
  {
    "id": "danfoss",
    "name": "Danfoss",
    "slug": "danfoss",
    "status": "logo_ready",
    "priority": 34,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/danfoss.svg",
    "logo_source_url": "https://www.danfoss.com/static/images/new-logo.svg",
    "official_site": "https://www.danfoss.com/en/",
    "category": "ОВиК / автоматика",
    "note": "Автоматика, клапаны, приводы и оборудование для отопления, холодоснабжения и инженерных систем."
  },
  {
    "id": "roca",
    "name": "Roca",
    "slug": "roca",
    "status": "logo_ready",
    "priority": 35,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/roca.svg",
    "logo_source_url": "https://www.roca.com/documents/20126/346080475/roca-logo.svg/4dc29d13-1df3-b628-786b-7c63db57cdcd?t=1753429104544",
    "official_site": "https://www.roca.com/",
    "category": "Сантехническая керамика",
    "note": "Санитарная керамика, мебель и оборудование для комплектации санузлов в жилых и общественных объектах."
  },
  {
    "id": "peri",
    "name": "PERI",
    "slug": "peri",
    "status": "logo_ready",
    "priority": 36,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/peri.webp",
    "logo_source_url": "https://www.peri.com/.resources/fe2/webresources/img/peri-logo.webp",
    "official_site": "https://www.peri.com/en",
    "category": "Опалубка / строительные леса",
    "note": "Опалубочные системы, строительные леса и инженерные решения для монолитного строительства."
  },
  {
    "id": "navigator",
    "name": "Navigator",
    "slug": "navigator",
    "status": "logo_ready",
    "priority": 37,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/navigator.svg",
    "logo_source_url": "https://navigator-light.ru/design/svg/logo.svg",
    "official_site": "https://navigator-light.ru/",
    "category": "Освещение",
    "note": "Светотехника, лампы, электрика и сопутствующие решения для освещения строительных объектов."
  },
  {
    "id": "glims",
    "name": "GLIMS",
    "slug": "glims",
    "status": "logo_ready",
    "priority": 38,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/glims.svg",
    "logo_source_url": "https://glims.ru/upload/CMax/810/hii4oej8qr16ik2759y0x0kr6tk5n0tl/logo_glims.svg",
    "official_site": "https://glims.ru/",
    "category": "Строительные смеси",
    "note": "Строительные смеси, гидроизоляция, клеевые составы и материалы для отделочных работ."
  },
  {
    "id": "santek",
    "name": "Santek",
    "slug": "santek",
    "status": "logo_ready",
    "priority": 39,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/santek.svg",
    "logo_source_url": "https://santek.ru/image/logo.svg",
    "official_site": "https://santek.ru/",
    "category": "Сантехническая керамика",
    "note": "Санитарная керамика и решения для комплектации ванных комнат, санузлов и сантехнических зон."
  },
  {
    "id": "veka",
    "name": "VEKA",
    "slug": "veka",
    "status": "logo_ready",
    "priority": 40,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/veka.svg",
    "logo_source_url": "https://www.veka.ru/images/icons/logo.svg",
    "official_site": "https://www.veka.ru/",
    "category": "Оконные профильные системы",
    "note": "Профильные системы ПВХ для окон, дверей и светопрозрачных конструкций."
  },
  {
    "id": "bergauf",
    "name": "Bergauf",
    "slug": "bergauf",
    "status": "logo_ready",
    "priority": 41,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/bergauf.svg",
    "logo_source_url": "https://bergauf.ru/wp-content/themes/template/img/logo24.svg",
    "official_site": "https://bergauf.ru/",
    "category": "Строительные смеси",
    "note": "Сухие строительные смеси, клеи, штукатурки и отделочные материалы для строительных работ."
  },
  {
    "id": "ani-plast",
    "name": "ANI Plast",
    "slug": "ani-plast",
    "status": "logo_ready",
    "priority": 42,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ani-plast.png",
    "logo_source_url": "https://www.aniplast.ru/local/templates/main/img/logo.png",
    "official_site": "https://www.aniplast.ru/",
    "category": "Сантехническая арматура",
    "note": "Сантехническая арматура, сифоны, трапы и комплектующие для водоотведения и санузлов."
  },
  {
    "id": "clivet",
    "name": "Clivet",
    "slug": "clivet",
    "status": "logo_ready",
    "priority": 43,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/clivet.svg",
    "logo_source_url": "https://www.clivet.com/o/clivet-liferay-nuance-theme/images/clivet/logo-simple.svg",
    "official_site": "https://www.clivet.com/",
    "category": "ОВиК / климатическое оборудование",
    "note": "Климатическое оборудование, чиллеры, тепловые насосы и системы кондиционирования для инженерных объектов."
  },
  {
    "id": "iva",
    "name": "IVA",
    "slug": "iva",
    "status": "logo_ready",
    "priority": 44,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/iva-readable.svg",
    "logo_source_url": "https://iva.ru/assets/templates/main/assets/img/logo.svg",
    "official_site": "https://iva.ru/ru/",
    "category": "Слаботочные системы / корпоративная связь",
    "note": "Платформы видеоконференцсвязи и корпоративных коммуникаций для переговорных, диспетчерских и рабочих зон."
  },
  {
    "id": "ippon",
    "name": "Ippon",
    "slug": "ippon",
    "status": "logo_ready",
    "priority": 45,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ippon.svg",
    "logo_source_url": "https://static.ippon.ru/img2023/Logo.svg",
    "official_site": "https://ippon.ru/",
    "category": "ИБП / защита электропитания",
    "note": "Источники бесперебойного питания и оборудование защиты электропитания для инженерной инфраструктуры."
  },
  {
    "id": "iru",
    "name": "iRU",
    "slug": "iru",
    "status": "logo_ready",
    "priority": 46,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/iru-dark.svg",
    "logo_source_url": "https://static.iru.ru/img/logo.svg",
    "official_site": "https://www.iru.ru/",
    "category": "ИТ-оборудование",
    "note": "Компьютерная техника, серверное оборудование и ИТ-решения для оснащения объектов."
  },
  {
    "id": "jazzway",
    "name": "JazzWay",
    "slug": "jazzway",
    "status": "logo_ready",
    "priority": 47,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/jazzway.svg",
    "logo_source_url": "https://www.jazz-way.com/images/logo-jazz.svg",
    "official_site": "https://www.jazz-way.com/",
    "category": "Освещение",
    "note": "Светодиодные светильники, лампы и электротехническая продукция для внутреннего и наружного освещения."
  },
  {
    "id": "tdm-electric",
    "name": "TDM Electric",
    "slug": "tdm-electric",
    "status": "logo_ready",
    "priority": 48,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/tdm-electric.svg",
    "logo_source_url": "https://tdme.ru/img/logo.svg",
    "official_site": "https://tdme.ru/",
    "category": "Электротехническое оборудование",
    "note": "Электротехническая продукция, модульное оборудование, кабеленесущие системы и светотехника."
  },
  {
    "id": "nordfox",
    "name": "NORDFOX",
    "slug": "nordfox",
    "status": "logo_ready",
    "priority": 49,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/nordfox.png",
    "logo_source_url": "https://nordfox.ru/wp-content/uploads/2021/01/NF-Blue.png",
    "official_site": "https://nordfox.ru/",
    "category": "Фасадные системы",
    "note": "Фасадные системы, подсистемы и материалы для архитектурной комплектации зданий."
  },
  {
    "id": "rifar",
    "name": "RIFAR",
    "slug": "rifar",
    "status": "logo_ready",
    "priority": 50,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/rifar.png",
    "logo_source_url": "https://rifar.ru/images/logo.png",
    "official_site": "https://rifar.ru/",
    "category": "ОВиК / радиаторы",
    "note": "Радиаторы и отопительные приборы для жилых, общественных и коммерческих объектов."
  },
  {
    "id": "dormakaba",
    "name": "Dormakaba",
    "slug": "dormakaba",
    "status": "logo_ready",
    "priority": 51,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/dormakaba.svg",
    "logo_source_url": "https://www.dormakaba.com/ru-ru/icons/sprite-logos.svg#dk-logo-neutral",
    "official_site": "https://www.dormakaba.com/ru-ru",
    "category": "Дверная автоматика / доступ",
    "note": "Автоматические двери, дверная фурнитура и решения контроля доступа для общественных и коммерческих объектов."
  },
  {
    "id": "dekraft",
    "name": "DEKraft",
    "slug": "dekraft",
    "status": "logo_ready",
    "priority": 52,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/dekraft.svg",
    "logo_source_url": "https://www.dek.ru/logos/dekraft.svg",
    "official_site": "https://www.dek.ru/",
    "category": "Электрика",
    "note": "Электротехническое оборудование для щитовых, распределения и защиты инженерных систем."
  },
  {
    "id": "tarkett",
    "name": "Tarkett",
    "slug": "tarkett",
    "status": "logo_ready",
    "priority": 53,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/tarkett.svg",
    "logo_source_url": "https://www.tarkett.ru/",
    "official_site": "https://www.tarkett.ru/",
    "category": "Напольные покрытия",
    "note": "Напольные покрытия для коммерческих, общественных и жилых пространств."
  },
  {
    "id": "gauss",
    "name": "GAUSS",
    "slug": "gauss",
    "status": "logo_ready",
    "priority": 54,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/gauss.svg",
    "logo_source_url": "https://academy.gauss.ru/",
    "official_site": "https://gauss.ru/",
    "category": "Освещение",
    "note": "Светотехника и электротехническая продукция для внутреннего и наружного освещения."
  },
  {
    "id": "kentatsu",
    "name": "KENTATSU",
    "slug": "kentatsu",
    "status": "logo_ready",
    "priority": 55,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/kentatsu.svg",
    "logo_source_url": "https://kentatsurussia.ru/frontend/build/images/logo.svg",
    "official_site": "https://kentatsurussia.ru/",
    "category": "ОВиК / климатическое оборудование",
    "note": "Климатическое оборудование, сплит-системы, VRF и тепловые решения для инженерных объектов."
  },
  {
    "id": "ecophon",
    "name": "Ecophon",
    "slug": "ecophon",
    "status": "logo_ready",
    "priority": 56,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ecophon.svg",
    "logo_source_url": "https://www.ecophon.com/globalassets/new-site/media/logo/ecophon-logo-2023r3_black-01.svg",
    "official_site": "https://www.ecophon.com/",
    "category": "Акустические потолки",
    "note": "Акустические потолки и панели для общественных, офисных и коммерческих помещений."
  },
  {
    "id": "kontaktor",
    "name": "Контактор",
    "slug": "kontaktor",
    "status": "logo_ready",
    "priority": 57,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/kontaktor.svg",
    "logo_source_url": "https://www.kontaktor.ru/local/templates/kontaktor/build/img/rebranding/Kontaktor_by_IEK.svg",
    "official_site": "https://www.kontaktor.ru/",
    "category": "Электротехническое оборудование",
    "note": "Коммутационная аппаратура, защитные устройства и низковольтное оборудование для электрощитовых систем."
  },
  {
    "id": "prado",
    "name": "PRADO",
    "slug": "prado",
    "status": "logo_ready",
    "priority": 58,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/prado.webp",
    "logo_source_url": "https://radiator-prado.ru/upload/CMax/c2f/cfjod3b7deghsrwr5lxr9uc77u5b6ia6/logo.webp",
    "official_site": "https://radiator-prado.ru/",
    "category": "ОВиК / радиаторы",
    "note": "Стальные панельные радиаторы и отопительное оборудование для жилых, общественных и коммерческих объектов."
  },
  {
    "id": "idis",
    "name": "IDIS",
    "slug": "idis",
    "status": "logo_ready",
    "priority": 59,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/idis.png",
    "logo_source_url": "https://www.idisglobal.com/images/etc/ci/IDIS_C.I_v3.1.png",
    "official_site": "https://www.idisglobal.com/",
    "category": "Слаботочные системы / видеонаблюдение",
    "note": "Системы видеонаблюдения и безопасности для слаботочной инфраструктуры объектов."
  },
  {
    "id": "akvalid",
    "name": "Аквалид",
    "slug": "akvalid",
    "status": "logo_ready",
    "priority": 60,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/aqualid.svg",
    "logo_source_url": "https://static.tildacdn.com/tild6264-3533-4535-a366-363135623431/photo.svg",
    "official_site": "https://aqualid.ru/",
    "category": "Водоподготовка",
    "note": "Системы водоочистки, фильтрации и инженерной подготовки воды для технических объектов."
  },
  {
    "id": "sanext",
    "name": "Sanext",
    "slug": "sanext",
    "status": "logo_ready",
    "priority": 61,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/sanext.svg",
    "logo_source_url": "https://sanext.ru/",
    "official_site": "https://sanext.ru/",
    "category": "ОВиК / водоснабжение",
    "note": "Инженерное оборудование для отопления, водоснабжения и систем тёплого пола."
  },
  {
    "id": "sanita",
    "name": "Sanita",
    "slug": "sanita",
    "status": "logo_ready",
    "priority": 62,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/sanita.png",
    "logo_source_url": "https://static.tildacdn.com/tild6661-3431-4361-b466-346430643430/_.png",
    "official_site": "https://sanita.ru/",
    "category": "Сантехника",
    "note": "Российская санитарная керамика для комплектации санузлов, ванных комнат и сантехнических зон."
  },
  {
    "id": "socomec",
    "name": "Socomec",
    "slug": "socomec",
    "status": "logo_ready",
    "priority": 63,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/socomec.png",
    "logo_source_url": "https://www.socomec.com/assets/images/logo-blue.png",
    "official_site": "https://www.socomec.com/",
    "category": "Электропитание / ИБП",
    "note": "Оборудование электропитания, ИБП, коммутация и решения контроля качества электроэнергии."
  },
  {
    "id": "melke",
    "name": "Melke",
    "slug": "melke",
    "status": "logo_ready",
    "priority": 64,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/melke.webp",
    "logo_source_url": "https://www.melke.ru/assets/logo/melke-logo-hor-dark-fry.webp",
    "official_site": "https://www.melke.ru/",
    "category": "Архитектура / окна",
    "note": "ПВХ-профиль, оконные системы и решения остекления для жилых и коммерческих объектов."
  },
  {
    "id": "chzsk",
    "name": "ЧЗСК",
    "slug": "chzsk",
    "status": "logo_ready",
    "priority": 65,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/chzsk.png",
    "logo_source_url": "https://silicatbrick.ru/images/logos/8/logo8.png",
    "official_site": "https://silicatbrick.ru/",
    "category": "Конструктив / силикатный кирпич",
    "note": "Силикатный кирпич и стеновые материалы для конструктивной комплектации строительных объектов."
  },
  {
    "id": "alroks",
    "name": "АЛРОКС",
    "slug": "alroks",
    "status": "logo_ready",
    "priority": 66,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/alrox.png",
    "logo_source_url": "https://static.tildacdn.com/tild6536-3333-4262-a466-653230353139/_x0020_1_2.png",
    "official_site": "https://alrox.ru/",
    "category": "Архитектура / алюминиевые профили",
    "note": "Алюминиевые профильные системы для фасадов, витражей, оконных и архитектурных конструкций."
  },
  {
    "id": "aktivstok",
    "name": "АктивСток",
    "slug": "aktivstok",
    "status": "logo_ready",
    "priority": 67,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/aktivstok.png",
    "logo_source_url": "https://akstok.com/wp-content/uploads/2017/09/aktivstok.png",
    "official_site": "https://akstok.com/",
    "category": "ВК / водоотведение",
    "note": "Насосные станции, очистные сооружения и стеклопластиковые инженерные системы для водоотведения."
  },
  {
    "id": "kaleva",
    "name": "Kaleva",
    "slug": "kaleva",
    "status": "logo_ready",
    "priority": 68,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/kaleva.svg",
    "logo_source_url": "https://www.okna.ru/local/templates/kaleva/images/logo.svg",
    "official_site": "https://www.okna.ru/",
    "category": "Архитектура / окна",
    "note": "Оконные системы, ПВХ-профиль и решения остекления для жилых и коммерческих объектов."
  },
  {
    "id": "santeri",
    "name": "Santeri",
    "slug": "santeri",
    "status": "logo_ready",
    "priority": 69,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/santeri.png",
    "logo_source_url": "https://santeri.su/local/templates/santeri/images/logo.png",
    "official_site": "https://santeri.su/",
    "category": "Сантехника",
    "note": "Санитарная керамика и сантехнические изделия для комплектации ванных комнат и санузлов."
  },
  {
    "id": "alfamatika",
    "name": "Альфаматика",
    "slug": "alfamatika",
    "status": "logo_ready",
    "priority": 70,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/alphamatica.svg",
    "logo_source_url": "https://alphamatica.ru/_next/static/media/LogoCompany.6ab5ef73.svg",
    "official_site": "https://alphamatica.ru/aboutPage",
    "category": "Слаботочные системы / электронная очередь",
    "note": "Электронные очереди, терминалы и программные решения для автоматизации клиентских зон."
  },
  {
    "id": "ardatovskiy-svetotehnicheskiy-zavod",
    "name": "Ардатовский светотехнический завод",
    "slug": "ardatovskiy-svetotehnicheskiy-zavod",
    "status": "logo_ready",
    "priority": 71,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/ardatov-lighting-plant.png",
    "logo_source_url": "https://astz.ru/upload/files/brand/logo%20ASTZ.zip",
    "official_site": "https://astz.ru/",
    "category": "ЭОМ / освещение",
    "note": "Светотехническое оборудование и светильники для ЭОМ, архитектурного и промышленного освещения."
  },
  {
    "id": "eltex",
    "name": "Eltex",
    "slug": "eltex",
    "status": "logo_ready",
    "priority": 72,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/eltex.svg",
    "logo_source_url": "https://eltex.ru/images/logo.svg",
    "official_site": "https://eltex.ru/",
    "category": "Слаботочные системы / активное оборудование ЛВС",
    "note": "Сетевое и телекоммуникационное оборудование для ЛВС, связи и инфраструктуры объектов."
  },
  {
    "id": "integra-kabel",
    "name": "Интегра Кабель",
    "slug": "integra-kabel",
    "status": "logo_ready",
    "priority": 73,
    "show_on_home": false,
    "show_on_partners": true,
    "logo": "assets/img/logos/partners/integra-kabel.png",
    "logo_source_url": "https://intg.ru/wp-content/uploads/2019/12/logo-integra-cable-systems.png",
    "official_site": "https://intg.ru/",
    "category": "Слаботочные системы / ВОК",
    "note": "Волоконно-оптический кабель для грунта, канализации, труб, подвеса и объектных сетей связи."
  }
];

function initMenu(){
  const btn = qs('#menuBtn'); const nav = qs('#mainNav');
  if(btn && nav) btn.addEventListener('click',()=>nav.classList.toggle('open'));
}
function initHeaderContactDropdown(){
  qsa('[data-header-contact]').forEach(menu=>{
    const toggle = qs('[data-header-contact-toggle]', menu);
    if(!toggle) return;
    const close = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false');
    };
    const open = () => {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded','true');
    };
    toggle.addEventListener('click', event=>{
      event.preventDefault();
      menu.classList.contains('is-open') ? close() : open();
    });
    menu.addEventListener('focusout', ()=>{
      setTimeout(()=>{
        if(!menu.contains(document.activeElement)) close();
      }, 0);
    });
    document.addEventListener('click', event=>{
      if(!menu.contains(event.target)) close();
    });
    document.addEventListener('keydown', event=>{
      if(event.key === 'Escape' && menu.classList.contains('is-open')){
        close();
        toggle.focus();
      }
    });
  });
}
function attachHeaderMegaMenu(trigger, panel){
  if(!trigger || !panel) return;
  trigger.classList.add('has-mega-menu');
  trigger.setAttribute('aria-haspopup','true');
  trigger.setAttribute('aria-controls',panel.id);
  trigger.setAttribute('aria-expanded','false');
  panel.setAttribute('role','region');
  let openTimer = null;
  let closeTimer = null;
  const isOpen = () => panel.classList.contains('is-open');
  const show = () => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeHeaderMegaMenus();
    panel.classList.add('is-open');
    trigger.classList.add('mega-active');
    panel.setAttribute('aria-hidden','false');
    trigger.setAttribute('aria-expanded','true');
  };
  const hide = () => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    panel.classList.remove('is-open');
    trigger.classList.remove('mega-active');
    panel.setAttribute('aria-hidden','true');
    trigger.setAttribute('aria-expanded','false');
  };
  const open = () => {
    clearTimeout(closeTimer);
    openTimer = setTimeout(show, 220);
  };
  const close = () => {
    clearTimeout(openTimer);
    closeTimer = setTimeout(hide, 280);
  };
  [trigger,panel].forEach(el=>{
    el.addEventListener('mouseenter', open);
    el.addEventListener('mouseleave', close);
    el.addEventListener('focusin', open);
    el.addEventListener('focusout', close);
  });
  trigger.addEventListener('click', e=>{
    if(window.matchMedia && window.matchMedia('(max-width: 1080px)').matches){
      return;
    }
    if(!isOpen()){
      e.preventDefault();
      show();
    }
  });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && isOpen()){
      hide();
      trigger.focus();
    }
    if(e.key === 'ArrowDown' && document.activeElement === trigger){
      e.preventDefault();
      show();
      const firstLink = qs('a,button', panel);
      if(firstLink) firstLink.focus();
    }
  });
  document.addEventListener('click', e=>{
    if(isOpen() && !panel.contains(e.target) && e.target !== trigger){
      hide();
    }
  });
}
function closeHeaderMegaMenus(){
  qsa('.mega-menu.is-open').forEach(panel=>{
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
  });
  qsa('.main-nav .mega-active').forEach(link=>{
    link.classList.remove('mega-active');
    link.setAttribute('aria-expanded','false');
  });
}
function isVendorsPage(){
  const path = location.pathname.replace(/\/$/, '');
  return path.endsWith('/vendors') || path.endsWith('/vendors.html');
}
function isPartnersPage(){
  const path = location.pathname.replace(/\/$/, '');
  return path.endsWith('/partners') || path.endsWith('/partners.html');
}
function vendorDirectionUrl(direction){
  return `/vendors?vendorDirection=${encodeURIComponent(direction)}#vendorRowsSection`;
}
const vendorMegaScopes = [
  {
    id:'construction',
    title:'Конструктив и отделка',
    text:'кирпич, блоки, фасады, сухие смеси, перегородки и интерьерные материалы',
    directions:['Архитектурные решения','Конструктивные решения'],
    examples:['ЛСР','BRAER','Технониколь']
  },
  {
    id:'engineering',
    title:'Инженерные системы',
    text:'ВК, ОВиК, насосы, изоляция, тепловые сети, газ и доступная среда',
    directions:['Водоснабжение и водоотведение','ОВиК и тепловые сети','Газоснабжение','Вертикальный транспорт','Доступная среда'],
    examples:['Wilo','Ридан','REHAU']
  },
  {
    id:'energy',
    title:'Электрика и свет',
    text:'ЭОМ, кабель, щитовое оборудование, освещение и подстанции',
    directions:['ЭОМ'],
    examples:['DKC','IEK','EKF']
  },
  {
    id:'safety',
    title:'Безопасность и связь',
    text:'АПС, ОПС, СКУД, видеонаблюдение, сети и слаботочные системы',
    directions:['Пожарная безопасность','Слаботочные сети и связь'],
    examples:['Рубеж','Dahua','Eltex']
  },
  {
    id:'it',
    title:'IT-инфраструктура',
    text:'серверы, СХД, коммутаторы, ЦОД, рабочие станции и ПО',
    directions:['IT-инфраструктура'],
    examples:['DEPO Computers','YADRO','KVADRA']
  },
  {
    id:'tech',
    title:'ТХ оборудование',
    text:'медицинские газы, досмотровое оборудование, мебель и спецкомплектация',
    directions:['Технологическое оборудование'],
    examples:['Samsung','Philips','Drager']
  }
];
function vendorScopeUrl(scope){
  return `/vendors?vendorScope=${encodeURIComponent(scope)}#vendorRowsSection`;
}
function vendorScopeById(scope){
  return vendorMegaScopes.find(item => item.id === scope);
}
function vendorScopeFromUrl(){
  const params = new URLSearchParams(location.search);
  return params.get('vendorScope') || '';
}
function vendorScopeRows(scope){
  const item = vendorScopeById(scope);
  if(!item) return [];
  return getAllVendorRows().filter(row => item.directions.includes(row.group));
}
function resolveVendorDirection(value, sections){
  const wanted = normalizeSearch(value);
  if(!wanted) return '';
  return sections.find(section => normalizeSearch(section) === wanted)
    || sections.find(section => normalizeSearch(section).includes(wanted) || wanted.includes(normalizeSearch(section)))
    || '';
}
function vendorDirectionFromUrl(sections){
  const params = new URLSearchParams(location.search);
  const raw = params.get('vendorDirection') || params.get('direction') || '';
  if(raw) return resolveVendorDirection(raw, sections);
  const hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if(hash.startsWith('vendorDirection=')) return resolveVendorDirection(hash.replace('vendorDirection=', ''), sections);
  return '';
}
function vendorSearchFromUrl(){
  const params = new URLSearchParams(location.search);
  return params.get('vendorSearch') || '';
}
function partnerFilterUrl(filter){
  return filter && filter !== 'all'
    ? `/partners.html?partnerFilter=${encodeURIComponent(filter)}#partnersGrid`
    : '/partners.html#partnersGrid';
}
function resolvePartnerFilter(value, allowedFilters=[]){
  const wanted = normalizeSearch(value);
  if(!wanted) return '';
  const allowed = allowedFilters.length ? allowedFilters : ['all','electrical','climate','lighting','constructive','finish','lowcurrent','engineering','pending'];
  const aliases = {
    all:'all',
    'все':'all',
    electrical:'electrical',
    'электрика':'electrical',
    'электро':'electrical',
    climate:'climate',
    'климат':'climate',
    'климат и вк':'climate',
    'климат и овик':'climate',
    'овик':'climate',
    'вк':'climate',
    lighting:'lighting',
    'освещение':'lighting',
    constructive:'constructive',
    'конструктив':'constructive',
    'конструктивные':'constructive',
    finish:'finish',
    'отделка':'finish',
    'отделка и изоляция':'finish',
    lowcurrent:'lowcurrent',
    'слаботочные':'lowcurrent',
    'слаботочные сети':'lowcurrent',
    'связь':'lowcurrent',
    it:'it',
    'it-инфраструктура':'it',
    'ит':'it',
    'айти':'it',
    'серверы':'it',
    'схд':'it',
    'цод':'it',
    engineering:'engineering',
    'инженерия':'engineering',
    'инженерные системы':'engineering',
    pending:'pending',
    'ожидают согласования':'pending'
  };
  const aliased = aliases[wanted];
  if(aliased && allowed.includes(aliased)) return aliased;
  return allowed.find(filter => normalizeSearch(filter) === wanted)
    || allowed.find(filter => normalizeSearch(partnerFilterLabel(filter)) === wanted)
    || '';
}
function partnerFilterFromUrl(allowedFilters=[]){
  const params = new URLSearchParams(location.search);
  const raw = params.get('partnerFilter') || params.get('filter') || params.get('category') || '';
  if(raw) return resolvePartnerFilter(raw, allowedFilters);
  const hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if(hash.startsWith('partnerFilter=')) return resolvePartnerFilter(hash.replace('partnerFilter=', ''), allowedFilters);
  return '';
}
function initCatalogMegaMenu(){
  const topbar = qs('.topbar');
  const catalogLink = qs('.main-nav [data-nav="catalog"]');
  const blocks = (typeof catalogMegaBlocks !== 'undefined' && Array.isArray(catalogMegaBlocks) && catalogMegaBlocks.length)
    ? catalogMegaBlocks
    : (typeof categories !== 'undefined' && Array.isArray(categories) ? categories.map(cat=>({
      id:cat.id,
      title:cat.title,
      summary:cat.desc,
      directions:cat.positions || cat.products || [],
      systemsCount:(cat.positions || []).length,
      productGroupsCount:(cat.products || []).length,
      url:detailLinkForCategory(cat),
      image:cat.img,
    })) : []);
  if(!topbar || !catalogLink || !blocks.length) return;
  const panel = document.createElement('div');
  panel.className = 'mega-menu catalog-mega-menu';
  panel.id = 'catalogMegaMenu';
  panel.setAttribute('aria-label','Раскрытое меню каталога по основным блокам');
  panel.setAttribute('aria-hidden','true');
  const cards = blocks.map(block=>{
    const visibleDirections = (block.directions || []).slice(0,3);
    const hiddenDirections = Math.max(0, (block.directions || []).length - visibleDirections.length);
    const directions = visibleDirections.join(' · ') + (hiddenDirections ? ` · +${hiddenDirections}` : '');
    const meta = [
      block.systemsCount ? `${block.systemsCount} систем` : '',
      block.productGroupsCount ? `${block.productGroupsCount} групп` : '',
    ].filter(Boolean).join(' · ');
    return `<a class="mega-direction-card mega-block-card catalog-scope-card" href="${escapeHtml(block.url || `/catalog-${block.id}`)}">
      <span class="mega-direction-copy">
        ${meta ? `<em>${escapeHtml(meta)}</em>` : ''}
        <b>${escapeHtml(block.title)}</b>
        <small>${escapeHtml(block.summary || 'Крупный блок каталога')}</small>
        <span class="mega-catalog-card-examples">${escapeHtml(directions || 'Направления внутри блока')}</span>
      </span>
      <span class="mega-direction-media"><img src="${escapeHtml(block.image || 'assets/img/hero-cover.webp')}" alt="" loading="lazy"></span>
    </a>`;
  }).join('');
  panel.innerHTML = `<div class="mega-menu-shell">
    <aside class="mega-menu-intro">
      <span class="mega-menu-kicker">Каталог</span>
      <strong>Основные блоки поставки</strong>
      <p>Верхний уровень каталога: от крупных блоков к направлениям, системам и товарным группам.</p>
      <div class="mega-menu-actions"><a class="btn small" href="/catalog">Весь каталог</a><a class="btn ghost small" href="/contacts#request-form">Отправить спецификацию</a></div>
    </aside>
    <div class="mega-direction-grid">${cards}</div>
  </div>`;
  topbar.appendChild(panel);
  attachHeaderMegaMenu(catalogLink, panel);
}
function initVendorsMegaMenu(){
  const topbar = qs('.topbar');
  const vendorsLink = qs('.main-nav [data-nav="vendors"]');
  if(!topbar || !vendorsLink) return;
  const vendorAdvantages = [
    {title:'Проверяем документацию', text:'паспорт, сертификаты, серии и соответствие проекту', href:'/contacts#request-form'},
    {title:'Подбираем аналоги', text:'сравниваем производителей по срокам, бюджету и параметрам', href:'/catalog#quickSelection'},
    {title:'Собираем комплектацию', text:'закрываем позиции по направлениям без лишнего шума', href:'/vendors#allManufacturers'},
    {title:'Ведём поставку', text:'фиксируем наличие, сроки и замену при изменении спецификации', href:'/about#aboutWorkflow'}
  ];
  const groups = vendorMegaScopes.map(item=>{
    const rows = vendorScopeRows(item.id);
    const brands = uniqueBrandsFromRows(rows);
    const examples = item.examples && item.examples.length ? item.examples : brands.slice(0,3);
    const meta = [
      rows.length ? `${rows.length} групп` : '',
      brands.length ? `${brands.length}+ брендов` : '',
    ].filter(Boolean).join(' · ');
    return `<a class="mega-group-card vendor-scope-card" href="${vendorScopeUrl(item.id)}" data-vendor-scope-link="${item.id}">
    <span class="mega-group-card-meta">${escapeHtml(meta || 'Сектор базы производителей')}</span>
    <b>${item.title}</b><small>${item.text}</small>
    <span class="mega-group-card-examples">${examples.map(escapeHtml).join(' · ')}</span>
  </a>`;
  }).join('');
  const advantages = vendorAdvantages.map(item=>`<a class="mega-advantage-card" href="${item.href}">
    <b>${item.title}</b><small>${item.text}</small>
  </a>`).join('');
  const panel = document.createElement('div');
  panel.className = 'mega-menu vendors-mega-menu';
  panel.id = 'vendorsMegaMenu';
  panel.setAttribute('aria-label','Раскрытое меню производителей');
  panel.setAttribute('aria-hidden','true');
  panel.innerHTML = `<div class="mega-menu-shell mega-menu-shell-vendors">
    <aside class="mega-menu-intro">
      <span class="mega-menu-kicker">Производители</span>
      <strong>Бренды под задачу проекта</strong>
      <p>Быстрый вход в секторы базы: сначала выбираем область поставки, затем смотрим производителей по товарным группам.</p>
      <div class="mega-menu-actions"><a class="btn small" href="/vendors">Все производители</a><a class="btn ghost small" href="/contacts#request-form">Подобрать замену</a></div>
    </aside>
    <div class="mega-menu-content">
      <div class="mega-group-list">${groups}</div>
      <div class="mega-advantage-list">${advantages}</div>
    </div>
  </div>`;
  topbar.appendChild(panel);
  attachHeaderMegaMenu(vendorsLink, panel);
}
function initPartnersMegaMenu(){
  const topbar = qs('.topbar');
  const partnersLink = qs('.main-nav [data-nav="partners"]');
  if(!topbar || !partnersLink) return;
  const partnersList = getUnifiedBrandItems({partners:true, includeCatalogVendors:true, logoOnly:false, limit:260});
  if(!partnersList.length) return;
  const logoItems = partnersList
    .filter(item=>item.logo);
  const logos = logoItems.map(item=>partnerShowcaseLogo(item, '/partners.html')).join('');
  const filters = [
    {label:'Электрика', key:'electrical', text:'кабель, щитовое оборудование, автоматика и питание'},
    {label:'Климат и ВК', key:'climate', text:'ОВиК, насосы, отопление, водоснабжение и водоотведение'},
    {label:'Конструктив', key:'constructive', text:'кирпич, блоки, фасады, профиль и строительные материалы'},
    {label:'Отделка', key:'finish', text:'изоляция, плитка, сухие смеси, ГКЛ и покрытия'},
    {label:'Освещение', key:'lighting', text:'светильники, LED, наружное и внутреннее освещение'},
    {label:'Слаботочные', key:'lowcurrent', text:'связь, безопасность, СКУД, видео и аудиосистемы'},
    {label:'Инженерные системы', key:'engineering', text:'комплектация инженерных разделов и совместимых решений'},
    {label:'IT-инфраструктура', key:'it', text:'серверы, СХД, коммутаторы, ЦОД и рабочие станции'}
  ];
  const cards = filters.map(item=>{
    const scoped = partnersList.filter(partner=>partnerFilterGroup(partner) === item.key);
    const examples = scoped.slice(0,4).map(partner=>partner.name);
    const hidden = Math.max(0, scoped.length - examples.length);
    const examplesText = examples.length
      ? examples.map(escapeHtml).join(' · ') + (hidden ? ` · +${hidden}` : '')
      : 'Подберём бренд под спецификацию';
    const meta = scoped.length ? `${scoped.length} партнёров` : 'по запросу';
    return `<a class="partner-filter-card" href="${partnerFilterUrl(item.key)}" data-partner-menu-filter="${item.key}">
      <span class="mega-group-card-meta">${escapeHtml(meta)}</span>
      <b>${escapeHtml(item.label)}</b>
      <span class="mega-group-card-examples">${examplesText}</span>
    </a>`;
  }).join('');
  const panel = document.createElement('div');
  panel.className = 'mega-menu partners-mega-menu';
  panel.id = 'partnersMegaMenu';
  panel.setAttribute('aria-label','Раскрытое меню партнёров');
  panel.setAttribute('aria-hidden','true');
  panel.innerHTML = `<div class="mega-menu-shell mega-menu-shell-partners">
    <aside class="mega-menu-intro">
      <span class="mega-menu-kicker">Партнёры</span>
      <strong>Официальные бренды для поставки</strong>
      <p>Быстрый вход в партнёрские бренды по направлениям: от категории сразу к отфильтрованной витрине.</p>
      <div class="mega-menu-actions"><a class="btn small" href="/partners.html#partnersGrid">Все партнёры</a><a class="btn ghost small" href="/contacts#request-form">Запросить КП</a></div>
    </aside>
    <div class="mega-menu-content">
      <div class="partner-logo-carousel is-at-start" data-partner-logo-carousel aria-label="Партнёрские логотипы">
        <button class="partner-logo-nav partner-logo-nav-prev" type="button" aria-label="Листать логотипы назад" data-partner-logo-prev>‹</button>
        <div class="partner-logo-showcase" tabindex="0" aria-label="Логотипы партнёров">${logos}</div>
        <button class="partner-logo-nav partner-logo-nav-next" type="button" aria-label="Листать логотипы вперёд" data-partner-logo-next>›</button>
      </div>
      <div class="partner-filter-card-list" aria-label="Фильтры партнёров">${cards}</div>
    </div>
  </div>`;
  topbar.appendChild(panel);
  initPartnerLogoCarousel(panel);
  attachHeaderMegaMenu(partnersLink, panel);
}
function initPartnerLogoCarousel(scope=document){
  const roots = [];
  if(scope && scope.matches && scope.matches('[data-partner-logo-carousel]')) roots.push(scope);
  if(scope && scope.querySelectorAll) roots.push(...scope.querySelectorAll('[data-partner-logo-carousel]'));
  roots.forEach(root=>{
    if(root.dataset.partnerCarouselReady === 'true') return;
    const track = root.querySelector('.partner-logo-showcase');
    const prev = root.querySelector('[data-partner-logo-prev]');
    const next = root.querySelector('[data-partner-logo-next]');
    if(!track || !prev || !next) return;
    root.dataset.partnerCarouselReady = 'true';
    const update = ()=>{
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
      const atStart = track.scrollLeft <= 4;
      const atEnd = track.scrollLeft >= maxScroll;
      const canScroll = maxScroll > 0;
      root.classList.toggle('is-at-start', atStart || !canScroll);
      root.classList.toggle('is-at-end', atEnd || !canScroll);
      root.classList.toggle('is-scrollable', canScroll);
      prev.disabled = atStart || !canScroll;
      next.disabled = atEnd || !canScroll;
      prev.hidden = !canScroll;
      next.hidden = !canScroll;
    };
    const step = ()=>Math.max(320, Math.floor(track.clientWidth * .72));
    prev.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      track.scrollBy({left:-step(),behavior:'smooth'});
    });
    next.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      track.scrollBy({left:step(),behavior:'smooth'});
    });
    track.addEventListener('scroll',()=>requestAnimationFrame(update),{passive:true});
    window.addEventListener('resize',()=>requestAnimationFrame(update),{passive:true});
    requestAnimationFrame(update);
    setTimeout(update,500);
  });
}
function partnerShowcaseLogo(partner, basePath='/partners'){
  const id = escapeHtml(partner.id || partner.slug || '');
  const name = escapeHtml(partner.name || 'Партнёр');
  const logo = partner.logo ? escapeHtml(partner.logo) : '';
  const href = partner.sourceType === 'catalog_vendor' && String(basePath).includes('/partners')
    ? `/vendors?vendorSearch=${encodeURIComponent(partner.name || '')}#vendorRowsSection`
    : `${basePath}#${id}`;
  if(!logo){
    return `<a class="mega-logo-card mega-partner-logo-card partner-showcase-logo partner-showcase-logo-text" href="${href}" aria-label="${name}"><span>${name}</span></a>`;
  }
  return `<a class="mega-logo-card mega-partner-logo-card partner-showcase-logo" href="${href}" aria-label="${name}">
    <img src="${logo}" alt="${name}" loading="lazy">
  </a>`;
}
function flagIsTrue(value){
  return value === true || value === 1 || String(value || '').toLowerCase() === 'true';
}
function partnerKey(item){
  return normalizeSearch(item && (item.slug || item.id || item.name || '')).replace(/[^a-zа-я0-9]+/gi,'');
}
function catalogVendorToPartnerItem(item, index=0){
  const name = item.vendor_name || item.normalized_name || item.name || 'Производитель';
  const slug = item.vendor_slug || item.slug || slugifyVendorName(name);
  const direction = item.direction_title || item.source_direction || item.direction || '';
  const system = item.system_title || item.source_area || item.group || '';
  const product = item.product_group_title || item.source_type || item.type || '';
  const block = item.global_block_title || '';
  const path = [block, direction, system, product].filter(Boolean).join(' / ');
  const publicCategory = direction || block || 'Производитель каталога';
  const publicNote = [system, product].filter(Boolean).join(' / ');
  return normalizePartnerItem({
    id: slug,
    slug,
    name,
    status: item.status || (item.logo ? 'logo_ready' : 'catalog_vendor'),
    priority: 420 + index,
    show_on_home: flagIsTrue(item.show_on_home),
    show_on_partners: flagIsTrue(item.show_in_partners),
    logo: item.logo || '',
    logo_source_url: item.logo_source_url || '',
    official_site: item.official_site || '',
    category: publicCategory,
    note: publicNote ? `Связан с каталогом: ${publicNote}.` : 'Производитель из каталога ПНП.',
    globalBlock: block,
    direction,
    system,
    product,
    sourceType: 'catalog_vendor'
  });
}
function getCatalogVendorBrandItems(options={}){
  const map = typeof catalogVendorMap !== 'undefined' && Array.isArray(catalogVendorMap) ? catalogVendorMap : [];
  const byKey = new Map();
  map.forEach((item,index)=>{
    if(!item || !item.vendor_name) return;
    if(options.partnersOnly && !flagIsTrue(item.show_in_partners)) return;
    if(!(flagIsTrue(item.show_in_catalog) || flagIsTrue(item.show_in_vendors) || flagIsTrue(item.show_on_home))) return;
    if(options.homeOnly && !flagIsTrue(item.show_on_home)) return;
    if(options.logoOnly && !item.logo) return;
    const partner = catalogVendorToPartnerItem(item, index);
    if(options.partnersOnly && !partner.show_on_partners) return;
    const key = partner.slug || partnerKey(partner);
    if(!key) return;
    const existing = byKey.get(key);
    if(!existing || (!existing.logo && partner.logo) || (partner.show_on_home && !existing.show_on_home)){
      byKey.set(key, partner);
    }
  });
  return [...byKey.values()];
}
function mergeBrandItems(...lists){
  const byKey = new Map();
  lists.flat().filter(Boolean).forEach(item=>{
    const normalized = normalizePartnerItem(item);
    if(isPartnerPlaceholder(normalized)) return;
    const key = normalized.slug || partnerKey(normalized);
    if(!key) return;
    const existing = byKey.get(key);
    if(!existing){
      byKey.set(key, normalized);
      return;
    }
    byKey.set(key, {
      ...existing,
      ...normalized,
      priority: Math.min(Number(existing.priority || 999), Number(normalized.priority || 999)),
      logo: existing.logo || normalized.logo,
      official_site: existing.official_site || normalized.official_site,
      logo_source_url: existing.logo_source_url || normalized.logo_source_url,
      category: existing.category || normalized.category,
      note: existing.note || normalized.note
    });
  });
  return [...byKey.values()].sort((a,b)=>(a.priority-b.priority) || a.name.localeCompare(b.name,'ru'));
}
function getUnifiedBrandItems(options={}){
  const basePartners = (typeof embeddedPartners !== 'undefined' ? embeddedPartners : [])
    .map(normalizePartnerItem)
    .filter(item=>item.show_on_partners !== false && item.status !== 'placeholder');
  const catalogVendors = options.includeCatalogVendors === false ? [] : getCatalogVendorBrandItems({
    homeOnly: Boolean(options.home),
    partnersOnly: Boolean(options.partners),
    logoOnly: Boolean(options.logoOnly)
  });
  let list = mergeBrandItems(basePartners, catalogVendors);
  if(options.home){
    const homePartners = basePartners.filter(item=>item.show_on_home !== false).slice(0,42);
    const homeVendors = catalogVendors.filter(item=>item.logo && item.show_on_home !== false).slice(0,42);
    list = mergeBrandItems(homePartners, homeVendors);
  }
  if(options.partners){
    list = list.filter(item=>item.show_on_partners !== false);
  }
  if(options.logoOnly){
    list = list.filter(item=>item.logo);
  }
  return options.limit ? list.slice(0, options.limit) : list;
}
function logoForBrand(name){
  const officialPartners = typeof embeddedPartners !== 'undefined' ? embeddedPartners : [];
  const partner = [...officialPartners, ...partners].find(p => p.name === name || p.name.toLowerCase() === String(name).toLowerCase());
  if(partner) return partner.logo;
  const directory = typeof vendorDirectory !== 'undefined' ? vendorDirectory : [];
  const vendor = directory.find(v => normalizeVendorName(v.vendor_name || v.normalized_name || v.name) === normalizeVendorName(name));
  if(vendor && vendor.logo) return vendor.logo;
  const aliases={
    'ДКС':'DKC','Рехау':'REHAU','Технониколь':'Технониколь','KNAUF':'Кнауф','Кнауф':'Кнауф'
  };
  const alias = aliases[name];
  if(alias){
    const aliasedPartner = officialPartners.find(p => p.name === alias || p.name.toLowerCase() === String(alias).toLowerCase());
    if(aliasedPartner) return aliasedPartner.logo;
  }
  return '';
}
function normalizeVendorName(name){
  return String(name || '').replace(/[«»“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
}
function slugifyVendorName(name){
  const map = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
  };
  return normalizeVendorName(name)
    .replace(/[а-яё]/g, ch => map[ch] || '')
    .replace(/&/g, ' i ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'vendor';
}
function getVendorMetaByName(name){
  const directory = typeof vendorDirectory !== 'undefined' ? vendorDirectory : [];
  const source = typeof name === 'object' && name ? name : {vendor_name:name};
  const normalized = normalizeVendorName(source.normalized_name || source.vendor_name || source.name || name);
  const slug = source.slug || slugifyVendorName(source.vendor_name || source.name || name);
  return directory.find(v => v.slug === slug || normalizeVendorName(v.normalized_name || v.vendor_name) === normalized) || source;
}
function vendorBrandName(brand){
  return typeof brand === 'object' && brand ? (brand.vendor_name || brand.name || brand.normalized_name || '') : String(brand || '');
}
function catalogVendorRowsFromMap(){
  const map = typeof catalogVendorMap !== 'undefined' && Array.isArray(catalogVendorMap) ? catalogVendorMap : [];
  const grouped = new Map();
  map
    .filter(item => String(item.show_in_vendors || item.show_in_catalog || '') === 'true')
    .forEach(item=>{
      const globalBlock = item.global_block_title || '';
      const direction = item.direction_title || item.source_direction || '';
      const area = item.system_title || item.source_area || '';
      const type = item.product_group_title || item.source_type || area || direction;
      const key = [globalBlock, direction, area, type].map(normalizeSearch).join('::');
      if(!direction || !type || !key) return;
      if(!grouped.has(key)){
        grouped.set(key,{
          globalBlock,
          globalBlockId:item.global_block_id || '',
          group:direction,
          directionId:item.direction_id || '',
          area,
          systemId:item.system_id || '',
          type,
          productGroupId:item.product_group_id || '',
          brands:[]
        });
      }
      grouped.get(key).brands.push({
        vendor_name:item.vendor_name || item.normalized_name || '',
        normalized_name:item.vendor_name || item.normalized_name || '',
        slug:item.vendor_slug || '',
        logo:item.logo || '',
        official_site:item.official_site || ''
      });
    });
  return [...grouped.values()];
}
function mergeVendorRows(rows){
  const merged = new Map();
  rows.forEach(row=>{
    const key = [row.group || '', row.area || '', row.type || ''].map(normalizeSearch).join('::');
    if(!merged.has(key)){
      merged.set(key,{...row,brands:[...(row.brands || [])]});
      return;
    }
    const target = merged.get(key);
    const seen = new Set((target.brands || []).map(brand=>normalizeVendorName(vendorBrandName(brand))));
    (row.brands || []).forEach(brand=>{
      const name = normalizeVendorName(vendorBrandName(brand));
      if(!name || seen.has(name)) return;
      seen.add(name);
      target.brands.push(brand);
    });
  });
  return [...merged.values()];
}
function getAllVendorRows(){
  const base = typeof vendorRows !== 'undefined' && Array.isArray(vendorRows) ? vendorRows : [];
  return mergeVendorRows([...catalogVendorRowsFromMap(), ...base]);
}
function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function renderVendorChip(brand, extraClass=''){
  const {label, logo} = vendorChipData(brand);
  const safeLabel = escapeHtml(label);
  if(logo){
    return `<span class="vendor-chip vendor-chip-logo ${extraClass}" data-label="${safeLabel}" title="${safeLabel}" aria-label="${safeLabel}"><img src="${escapeHtml(logo)}" alt="${safeLabel}" loading="lazy" onerror="const chip=this.closest('.vendor-chip');chip.classList.remove('vendor-chip-logo');chip.classList.add('vendor-chip-text');chip.textContent=chip.dataset.label||this.alt||'';"></span>`;
  }
  return `<span class="vendor-chip vendor-chip-text ${extraClass}">${safeLabel}</span>`;
}
function vendorChipData(brand){
  const name = vendorBrandName(brand);
  const meta = getVendorMetaByName(brand);
  const label = name || (meta && meta.vendor_name) || '';
  const logo = meta && meta.logo ? meta.logo : logoForBrand(label);
  return {label, logo};
}
function renderVendorLogoChip(brand, extraClass=''){
  const {label, logo} = vendorChipData(brand);
  if(!logo) return '';
  const safeLabel = escapeHtml(label);
  return `<span class="vendor-chip vendor-chip-logo ${extraClass}" data-label="${safeLabel}" title="${safeLabel}" aria-label="${safeLabel}"><img src="${escapeHtml(logo)}" alt="${safeLabel}" loading="lazy" onerror="this.closest('.vendor-chip')?.remove();"></span>`;
}
function canonicalVendorToken(value){
  return normalizeSearch(value)
    .replace(/[«»“”"'()]/g,' ')
    .replace(/[^a-zа-я0-9]+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function partnerPriorityForVendor(name){
  const brandKey = canonicalVendorToken(name);
  if(!brandKey) return 0;
  const partnersList = (typeof embeddedPartners !== 'undefined' ? embeddedPartners : [])
    .filter(partner => partner && partner.status === 'logo_ready');
  for(const partner of partnersList){
    const partnerKey = canonicalVendorToken(partner.name);
    if(!partnerKey) continue;
    const partnerParts = partnerKey.split(' ');
    const brandParts = brandKey.split(' ');
    const exactOrPart = brandKey === partnerKey || partnerParts.some(part => part.length > 2 && brandParts.includes(part));
    const broadMatch = partnerKey.length > 3 && brandKey.length > 3 && (brandKey.includes(partnerKey) || partnerKey.includes(brandKey));
    if(exactOrPart || broadMatch){
      return Math.max(450, 1700 - Number(partner.priority || 999) * 10);
    }
  }
  return 0;
}
function patternScoreForVendor(name, row={}){
  const brandKey = canonicalVendorToken(name);
  const rowKey = canonicalVendorToken([row.group,row.area,row.type].join(' '));
  let score = 0;
  const addScores = (patterns, base) => patterns.forEach((pattern,index) => {
    if(brandKey.includes(canonicalVendorToken(pattern))) score += Math.max(20, base - index * 8);
  });
  addScores(['DKC','ДКС','IEK','EKF','Кабельный Альянс','Wilo','Ридан','REHAU','Технониколь','Кнауф','Волма','Gyproc','Гипрок','Магма','GRAND LINE','ROCKWOOL','KORF','MIDEA','DAIKIN','RIFAR','PRADO','FERON','GAUSS','Socomec','Danfoss','Sanext','Roca','Geberit','Tarkett','Unitile','Kerama Marazzi','Керама Марацци','NORDFOX','Ecler'], 520);
  if(rowKey.includes('конструктив') || rowKey.includes('кирпич') || rowKey.includes('блок') || rowKey.includes('гипс') || rowKey.includes('перегород')){
    addScores(['ЛСР','BRAER','Технониколь','Волма','Гипрок','Кнауф','Магма','Липковский кирпичный завод','Голицынский керамический завод','Ломинцевский кирпичный завод','Силикат','Богандинский кирпичный завод','Ново Иерусалимский кирпичный завод','Алексинский кирпичный завод','Болоховский кирпичный завод','Михневская керамика','Peri','Doka','НЛМК','Северсталь','ММК','Русал','ТМК'], 700);
  }
  if(rowKey.includes('элект') || rowKey.includes('эом') || rowKey.includes('свет')){
    addScores(['DKC','ДКС','IEK','EKF','TDM','Dekraft','Socomec','FERON','GAUSS','JazzWay','Световые Технологии','Ардатовский','PromLED','Navigator','Кабельный Альянс'], 650);
  }
  if(rowKey.includes('водоснаб') || rowKey.includes('водоотвед') || rowKey.includes('насос') || rowKey.includes('сантех')){
    addScores(['Wilo','Ридан','Danfoss','Sanext','REHAU','Geberit','Roca','Santek','АктивСток','Uponor'], 650);
  }
  if(rowKey.includes('овик') || rowKey.includes('вентиля') || rowKey.includes('кондиционир') || rowKey.includes('теплов')){
    addScores(['KORF','Ридан','MIDEA','DAIKIN','KENTATSU','Clivet','Toshiba','RIFAR','PRADO','BOSCH'], 650);
  }
  if(rowKey.includes('пожар')){
    addScores(['Рубеж','Аргус Спектр','АСТ Пирохимика','Гефест','Пульс','BIOSMART'], 650);
  }
  if(rowKey.includes('слаботоч') || rowKey.includes('связ') || rowKey.includes('видеонаблюд') || rowKey.includes('скуд')){
    addScores(['Dahua','HikVision','HiWatch','RVI','IDIS','Eltex','Dormakaba','Ecler','Альфаматика','IVA','Iru','Dell'], 650);
  }
  return score;
}
function sortedVendorBrandsForRow(row){
  const seen = new Set();
  return (row.brands || [])
    .map(vendorBrandName)
    .filter(Boolean)
    .map((name,index) => ({name,index,key:canonicalVendorToken(name)}))
    .filter(item => {
      if(!item.key || seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    })
    .map(item => {
      const meta = getVendorMetaByName(item.name);
      const readyScore = meta && meta.status === 'logo_ready' ? 420 : 0;
      const siteScore = meta && meta.official_site ? 80 : 0;
      const compactScore = item.name.length <= 36 ? 30 : 0;
      return {
        ...item,
        score: partnerPriorityForVendor(item.name) + patternScoreForVendor(item.name, row) + readyScore + siteScore + compactScore
      };
    })
    .sort((a,b) => (b.score - a.score) || (a.index - b.index))
    .map(item => item.name);
}
function renderVendorTextChip(name){
  return `<span class="vendor-chip vendor-chip-text">${escapeHtml(name)}</span>`;
}
function renderVendorBrandList(row){
  const brands = sortedVendorBrandsForRow(row);
  const isLong = brands.length > 12;
  const chips = brands.map(renderVendorTextChip).join('');
  const openText = `Показать всех (${brands.length})`;
  const toggleButton = extraClass => `<button class="vendor-brand-toggle ${extraClass}" type="button" data-vendor-brand-toggle data-open-text="${openText}" data-close-text="Свернуть список" aria-expanded="false">${extraClass.includes('top') ? 'Свернуть список' : openText}</button>`;
  return `<div class="vendor-brand-list${isLong ? ' is-collapsible' : ''}" data-vendor-brand-list>
    ${isLong ? toggleButton('vendor-brand-toggle-top') : ''}
    <div class="vendor-brand-list-items">${chips}</div>
    ${isLong ? toggleButton('vendor-brand-toggle-bottom') : ''}
  </div>`;
}
function vendorRowValue(row, key){
  const map = {
    block:'globalBlock',
    direction:'group',
    system:'area',
    product:'type'
  };
  return String(row && row[map[key] || key] || '').trim();
}
function uniqueVendorValues(rows, key){
  const seen = new Map();
  rows.forEach(row=>{
    const value = vendorRowValue(row, key);
    if(!value) return;
    const normalized = normalizeSearch(value);
    if(!seen.has(normalized)) seen.set(normalized, value);
  });
  return [...seen.values()].sort((a,b)=>a.localeCompare(b,'ru'));
}
function setSelectOptions(select, values, label, currentValue){
  if(!select) return;
  const valid = new Set(values);
  const previous = valid.has(currentValue) ? currentValue : 'all';
  select.innerHTML = `<option value="all">${label}</option>` + values.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  select.value = previous;
}
function vendorRowsByFilters(rows, filters={}, query=''){
  const q = normalizeSearch(query);
  return rows.filter(row=>{
    const byBlock = !filters.block || filters.block === 'all' || vendorRowValue(row,'block') === filters.block;
    const byDirection = !filters.direction || filters.direction === 'all' || vendorRowValue(row,'direction') === filters.direction;
    const bySystem = !filters.system || filters.system === 'all' || vendorRowValue(row,'system') === filters.system;
    const byProduct = !filters.product || filters.product === 'all' || vendorRowValue(row,'product') === filters.product;
    const hay = normalizeSearch([
      vendorRowValue(row,'block'),
      vendorRowValue(row,'direction'),
      vendorRowValue(row,'system'),
      vendorRowValue(row,'product'),
      ...(row.brands || []).map(vendorBrandName)
    ].join(' '));
    return byBlock && byDirection && bySystem && byProduct && (!q || hay.includes(q));
  });
}
function getVendorParam(name){
  return new URLSearchParams(location.search).get(name) || '';
}
function vendorFilterFromUrl(rows, key, paramName){
  const raw = getVendorParam(paramName);
  if(!raw) return 'all';
  const wanted = normalizeSearch(raw);
  return uniqueVendorValues(rows, key).find(value=>normalizeSearch(value) === wanted) || 'all';
}
function renderLogoTiles(targetId, items, limit){
  const el=qs(targetId); if(!el) return;
  const data=(items||[]).slice(0,limit||items.length);
  el.innerHTML=data.map(item=>{
    const name=typeof item==='string'?item:item.name;
    const logo=typeof item==='string'?logoForBrand(item):item.logo;
    return logo ? `<a class="logo-tile" href="/vendors" aria-label="${name}"><img src="${logo}" alt="${name}"></a>` : `<a class="logo-tile text-logo" href="/vendors" aria-label="${name}"><strong>${name}</strong></a>`;
  }).join('');
}

function detailLinkForCategory(cat){
  return cat && cat.id ? `/solution-${cat.id}` : '/catalog';
}

function initVendorFilterCards(){
  qsa('[data-vendor-filter-card]').forEach(card=>{
    const tabs=qsa('[data-vendor-tab]',card);
    const panels=qsa('[data-vendor-panel]',card);
    if(!tabs.length || !panels.length) return;
    const activate=key=>{
      tabs.forEach(tab=>{
        const active=tab.dataset.vendorTab===key;
        tab.classList.toggle('active',active);
        tab.setAttribute('aria-selected',active?'true':'false');
      });
      panels.forEach(panel=>panel.classList.toggle('active',panel.dataset.vendorPanel===key));
    };
    tabs.forEach(tab=>{
      tab.setAttribute('aria-selected',tab.classList.contains('active')?'true':'false');
      tab.addEventListener('click',()=>activate(tab.dataset.vendorTab));
    });
  });
}

function renderCategoryCards(targetId, limit){
  const el=qs(targetId); if(!el) return;
  const items=limit?categories.slice(0,limit):categories;
  el.innerHTML=items.map(cat=>{
    const positions=(cat.positions||cat.products||[]).slice(0,4).join(' · ');
    const shortDesc=(cat.cardText || positions || cat.desc);
    return `<article class="category-card" data-id="${cat.id}" data-group="${cat.group}">
      <div class="category-media"><img src="${cat.img}" alt="${cat.title}"></div>
      <div class="category-body">
        <h3>${cat.title}</h3>
        <p>${shortDesc}</p>
        <div class="category-actions"><a class="btn small" href="${detailLinkForCategory(cat)}">Подробнее →</a><a class="btn ghost small" href="/contacts">Получить подбор</a></div>
      </div>
    </article>`;
  }).join('');
}
function renderHomeMainBlocks(targetId){
  const el = qs(targetId);
  if(!el) return;
  const blocks = (typeof catalogMegaBlocks !== 'undefined' && Array.isArray(catalogMegaBlocks) && catalogMegaBlocks.length)
    ? catalogMegaBlocks
    : [];
  if(!blocks.length){
    renderCategoryCards(targetId, 5);
    return;
  }
  el.innerHTML = blocks.map((block,index)=>{
    const directions = Array.isArray(block.directions) ? block.directions : [];
    const visibleDirections = directions.slice(0, index < 2 ? 4 : 3);
    const hiddenDirections = Math.max(0, directions.length - visibleDirections.length);
    const chips = visibleDirections.map(direction=>`<span>${escapeHtml(direction)}</span>`).join('')
      + (hiddenDirections ? `<span>+${hiddenDirections}</span>` : '');
    const meta = [
      block.systemsCount ? `${block.systemsCount} систем` : '',
      block.productGroupsCount ? `${block.productGroupsCount} групп` : ''
    ].filter(Boolean).join(' · ');
    return `<article class="home-main-block-card ${index < 2 ? 'is-major' : ''}" data-id="${escapeHtml(block.id)}">
      <a class="home-main-block-media" href="${escapeHtml(block.url || '/catalog')}">
        <img src="${escapeHtml(block.image || 'assets/img/hero-cover.webp')}" alt="${escapeHtml(block.title)}" loading="${index < 2 ? 'eager' : 'lazy'}">
      </a>
      <div class="home-main-block-body">
        ${meta ? `<em>${escapeHtml(meta)}</em>` : ''}
        <h3>${escapeHtml(block.title)}</h3>
        <p>${escapeHtml(block.summary || 'Основной блок поставки ПНП.')}</p>
        <div class="home-main-block-chips">${chips}</div>
        <div class="category-actions"><a class="btn small" href="${escapeHtml(block.url || '/catalog')}">Открыть блок →</a><a class="btn ghost small" href="/contacts#request-form">Запросить КП</a></div>
      </div>
    </article>`;
  }).join('');
}
async function loadJsonData(url, fallback=[]){
  const embeddedFallback = url.includes('partners.json') || url.includes('featured_partners.json') ? embeddedPartners : fallback;
  try{
    if(location.protocol === 'file:') return embeddedFallback;
    const response = await fetch(url, {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }catch(error){
    console.warn(`Не удалось загрузить ${url}`, error);
    return embeddedFallback;
  }
}
function normalizePartnerItem(item){
  const name = item.name || item.title || 'Партнёр';
  const slug = item.slug || item.id || slugifyVendorName(name);
  return {
    id: item.id || slug,
    name,
    slug,
    status: item.status || 'placeholder',
    priority: Number(item.priority || 999),
    show_on_home: item.show_on_home !== false,
    show_on_partners: item.show_on_partners !== false,
    logo: item.logo || '',
    logo_source_url: item.logo_source_url || '',
    official_site: item.official_site || '',
    category: item.category || '',
    group: item.category || item.status || 'other',
    note: item.note || item.text || 'Информация о направлении поставки уточняется.',
    globalBlock: item.globalBlock || item.global_block_title || '',
    direction: item.direction || item.direction_title || '',
    system: item.system || item.system_title || '',
    product: item.product || item.product_group_title || '',
    sourceType: item.sourceType || item.source_type || ''
  };
}
function partnerLogoTile(partner, className=''){
  const name = partner.name;
  if(partner.logo){
    return `<div class="logo-tile ${className}"><img src="${partner.logo}" alt="${name}" loading="eager" decoding="async" onerror="this.closest('.logo-tile').classList.add('logo-fallback');this.remove();"><strong class="logo-fallback-text">${name}</strong></div>`;
  }
  return `<div class="logo-tile text-logo ${className}"><strong>${name}</strong></div>`;
}
function isPartnerPlaceholder(partner){
  const noEvidence = !partner.logo && !partner.official_site && !partner.logo_source_url;
  const placeholderStatus = partner.status === 'placeholder' || /^partner-\d+$/i.test(partner.slug || '');
  const placeholderName = /^Партнёр\s*\d+$/i.test(partner.name || '');
  return noEvidence && (placeholderStatus || placeholderName);
}
function partnersEmptyState(title, text){
  return `<div class="empty-state partner-empty-state"><b>${title}</b><span>${text}</span></div>`;
}
async function renderPartnersPreview(targetId, limit=12){
  const el=qs(targetId); if(!el) return;
  const data = await loadJsonData('data/partners.json');
  let list = mergeBrandItems(
      data.map(normalizePartnerItem).filter(p=>p.show_on_home && !isPartnerPlaceholder(p)).slice(0,42),
      getCatalogVendorBrandItems({homeOnly:true, logoOnly:true}).slice(0,42)
    )
    .slice(0,limit);
  if(!list.length){
    const featured = await loadJsonData('data/featured_partners.json');
    list = mergeBrandItems(
        featured.map(normalizePartnerItem).filter(p=>p.show_on_home && !isPartnerPlaceholder(p)).slice(0,42),
        getCatalogVendorBrandItems({homeOnly:true, logoOnly:true}).slice(0,42)
      )
      .slice(0,limit);
  }
  if(!list.length || list.every(isPartnerPlaceholder)){
    el.innerHTML = partnersEmptyState('Ключевые бренды временно не загружены', 'Обновите страницу или свяжитесь с нами, чтобы получить список партнёров под ваш объект.');
    return;
  }
  el.innerHTML = `<div class="partner-logo-carousel home-partner-logo-carousel is-at-start" data-partner-logo-carousel aria-label="Популярные бренды и партнёры">
    <button class="partner-logo-nav partner-logo-nav-prev" type="button" aria-label="Листать логотипы назад" data-partner-logo-prev>‹</button>
    <div class="partner-logo-showcase home-partner-logo-showcase" tabindex="0" aria-label="Логотипы партнёров">${list.map(p=>partnerShowcaseLogo(p, '/partners')).join('')}</div>
    <button class="partner-logo-nav partner-logo-nav-next" type="button" aria-label="Листать логотипы вперёд" data-partner-logo-next>›</button>
  </div>`;
  initPartnerLogoCarousel(el);
}
function renderPopularManufacturers(targetId, limit=20){
  const list = typeof popularManufacturers !== 'undefined' ? popularManufacturers : partners;
  renderLogoTiles(targetId, list, limit);
}
async function renderPartnersGrid(targetId){
  const el=qs(targetId); if(!el) return;
  const data = await loadJsonData('data/partners.json');
  const list = mergeBrandItems(
      data.map(normalizePartnerItem).filter(p=>p.show_on_partners),
      getCatalogVendorBrandItems({partnersOnly:true, logoOnly:true})
    )
    .filter(p=>p.show_on_partners)
    .sort((a,b)=>a.priority-b.priority);
  if(!list.length || list.every(isPartnerPlaceholder)){
    el.innerHTML = partnersEmptyState('Партнёры временно не загружены', 'Обновите страницу или отправьте запрос, и мы подберём бренды под вашу спецификацию.');
    return;
  }
  el.innerHTML=list.map(p=>{
    const group=partnerFilterGroup(p);
    const search=normalizePartnerSearch([p.name,p.category,p.note,p.status,partnerFilterLabel(group)].join(' '));
    const title = p.category || (p.status === 'placeholder' ? 'Ожидает согласования' : 'Партнёр');
    return `<article class="partner-card partner-${p.slug}" id="${p.id}" data-partner-group="${group}" data-partner-status="${p.status || ''}" data-partner-search="${search}">${partnerLogoTile(p,'partner-logo-tile')}<h3>${p.name}</h3><div class="partner-title">${title}</div><p>${p.note}</p></article>`;
  }).join('');
}
function normalizePartnerSearch(value){
  return String(value || '').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
}
function partnerFilterLabel(group){
  const labels={
    electrical:'Электрика',
    engineering:'Инженерные системы',
    climate:'Климат и ОВиК',
    lighting:'Освещение',
    constructive:'Конструктив',
    finish:'Отделка и изоляция',
    it:'IT-инфраструктура',
    lowcurrent:'Слаботочные системы',
    pending:'Ожидают согласования',
    other:'Прочее'
  };
  return labels[group] || labels.other;
}
function partnerFilterGroup(partner){
  const status=normalizePartnerSearch(partner.status);
  if(status.includes('placeholder') || status.includes('manual') || status.includes('review') || status.includes('hold')) return 'pending';
  const text=normalizePartnerSearch([partner.name,partner.category,partner.globalBlock,partner.direction,partner.system,partner.product].join(' '));
  if(/слаботоч|low-current|волс|вок|лвс|скуд|связ|security|video|surveillance|аудио|терминал|диспетчер|communications/.test(text)) return 'lowcurrent';
  if(/it-инфраструкт|it infrastructure|сервер|схд|цод|коммутатор|рабоч.*станц|корпоративн.*устройств|ноутбук|моноблок|планшет|depo|yadro|kvadra/.test(text)) return 'it';
  if(/свет|lighting|led|eom|solar|освещ/.test(text)) return 'lighting';
  if(/овик|hvac|climate|климат|вентиляц|кондицион|насос|радиатор|отоплен|water supply|водоснаб|канализац|санитар|sanitary|труб|вк|теплов/.test(text)) return 'climate';
  if(/электр|electrical|кабел|ups|power|энерг|автоматизац|automation|распредел|модульн/.test(text)) return 'electrical';
  if(/конструктив|constructive|кирпич|блок|строительн.*материал|formwork|scaffolding|фасад|профил|window|окн|алюмини/.test(text)) return 'constructive';
  if(/архитект|architecture|отдел|изоляц|теплоизоляц|кровл|гидроизоляц|плитк|керамогранит|смес|гипс|floor|покрыт|acoustic|акуст/.test(text)) return 'finish';
  if(/инженер|engineering|iiot|комплектац/.test(text)) return 'engineering';
  return 'other';
}
function initPartnersFilter(){
  const grid=qs('#partnersGrid'); if(!grid) return;
  const search=qs('#partnerSearch');
  const buttons=qsa('[data-partner-filter]');
  const empty=qs('#partnersEmpty');
  const allowedFilters = buttons.map(btn=>btn.dataset.partnerFilter || 'all');
  let active=partnerFilterFromUrl(allowedFilters) || 'all';
  function scrollToPartnersFilter(options={}){
    const target = qs('.partners-tools') || qs('#partnersGrid');
    if(!target) return;
    const topbar = qs('.topbar');
    const offset = Math.ceil((topbar ? topbar.getBoundingClientRect().height : 78) + 18);
    const top = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - offset);
    window.scrollTo({top, behavior:options.smooth ? 'smooth' : 'auto'});
  }
  function setActiveFilter(key){
    active = resolvePartnerFilter(key, allowedFilters) || 'all';
    buttons.forEach(btn=>{
      const isActive = (btn.dataset.partnerFilter || 'all') === active;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }
  function updatePartnerFilterUrl(key){
    if(!history.pushState) return;
    const url = new URL(location.href);
    if(key && key !== 'all') url.searchParams.set('partnerFilter', key);
    else url.searchParams.delete('partnerFilter');
    url.hash = 'partnersGrid';
    history.pushState(null, '', url.href);
  }
  function apply(){
    const query=normalizePartnerSearch(search?.value || '');
    let visible=0;
    qsa('.partner-card', grid).forEach(card=>{
      const group=card.dataset.partnerGroup || 'other';
      const hay=card.dataset.partnerSearch || card.textContent.toLowerCase();
      const okGroup=active==='all' || group===active;
      const okSearch=!query || hay.includes(query);
      const hide=!(okGroup && okSearch);
      card.hidden=hide;
      card.classList.toggle('hide', hide);
      if(!hide) visible++;
    });
    if(empty) empty.hidden = visible !== 0;
  }
  const counts={all:0};
  qsa('.partner-card', grid).forEach(card=>{
    const group=card.dataset.partnerGroup || 'other';
    counts.all++;
    counts[group]=(counts[group] || 0)+1;
  });
  buttons.forEach(btn=>{
    const key=btn.dataset.partnerFilter || 'all';
    const count=counts[key] || 0;
    btn.hidden = key !== 'all' && count === 0;
    if(!btn.querySelector('.filter-count')) btn.insertAdjacentHTML('beforeend', `<span class="filter-count">${count}</span>`);
  });
  if(active !== 'all' && !(counts[active] || 0)) active = 'all';
  setActiveFilter(active);
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    setActiveFilter(btn.dataset.partnerFilter || 'all');
    updatePartnerFilterUrl(active);
    apply();
  }));
  if(search) search.addEventListener('input', apply);
  apply();
  if(partnerFilterFromUrl(allowedFilters)){
    requestAnimationFrame(()=>scrollToPartnersFilter());
  }
  if(!document.documentElement.dataset.partnerFilterDelegated){
    document.documentElement.dataset.partnerFilterDelegated = '1';
    document.addEventListener('click', e=>{
      const link = e.target.closest('[data-partner-menu-filter]');
      if(!link || !isPartnersPage()) return;
      const filter = resolvePartnerFilter(link.dataset.partnerMenuFilter || '', allowedFilters);
      if(!filter) return;
      e.preventDefault();
      closeHeaderMegaMenus();
      if(search) search.value = '';
      setActiveFilter(filter);
      updatePartnerFilterUrl(filter);
      apply();
      requestAnimationFrame(()=>scrollToPartnersFilter({smooth:true}));
      requestAnimationFrame(closeHeaderMegaMenus);
      setTimeout(closeHeaderMegaMenus, 180);
    });
    window.addEventListener('popstate',()=>{
      const filter = partnerFilterFromUrl(allowedFilters) || 'all';
      setActiveFilter(filter);
      apply();
      if(filter !== 'all') requestAnimationFrame(()=>scrollToPartnersFilter());
    });
    window.addEventListener('hashchange',()=>{
      const filter = partnerFilterFromUrl(allowedFilters);
      if(!filter) return;
      setActiveFilter(filter);
      apply();
      requestAnimationFrame(()=>scrollToPartnersFilter());
    });
  }
}
function renderCatalogDetail(key){
  const el=qs('#catalogOutput'); if(!el) return;
  const cat=categories.find(c=>c.id===key)||categories[0];
  const logoTiles = cat.brands.slice(0,8).map(b=>{
    const logo = logoForBrand(b);
    return logo ? `<span class="visual-logo-pill"><img src="${logo}" alt="${b}"></span>` : `<span class="brand-pill">${b}</span>`;
  }).join('');
  const positions = (cat.positions||[]).map(p=>`<span>${p}</span>`).join('');
  el.innerHTML=`<div class="catalog-title-row"><div><h3 style="font-size:28px;margin-bottom:8px">${cat.title}</h3><p class="section-lead">${cat.desc}</p></div><div class="brand-pills">${cat.brands.slice(0,8).map(b=>`<span class="brand-pill">${b}</span>`).join('')}</div></div>
  <div class="catalog-detail-grid">
    <div>
      <div class="catalog-visual-card">
        <div class="visual-photo quick-visual"><img src="${cat.quickImg || cat.img}" alt="${cat.title}"></div>
        <div class="visual-brand-strip"><b>Производители и бренды по направлению</b><div class="visual-logo-row">${logoTiles}</div><a class="link-more" href="/vendors">Смотреть полный список производителей →</a></div>
      </div>
      <div class="position-cloud"><b>Основные позиции</b><div>${positions}</div></div>
      <div class="quick-points">
        <div class="quick-point"><b>Подбор под объект</b><span>Сравним требования, параметры, количество и сроки поставки.</span></div>
        <div class="quick-point"><b>Коммерческое предложение</b><span>Подготовим состав поставки и условия под вашу спецификацию.</span></div>
      </div>
    </div>
    <div class="product-grid">${cat.products.map(pr=>`<article class="product-card"><b>${pr}</b><span>Подберём исполнение, комплектацию и условия поставки под параметры вашего объекта.</span></article>`).join('')}</div>
  </div>`;
}

function initCatalog(){
  renderCategoryCards('#categoryGrid');
  const select=qs('#categorySelect');
  if(select){
    select.innerHTML=categories.map(c=>`<option value="${c.id}">${c.title}</option>`).join('');
    let hash=location.hash.replace('#',''); if(hash && categories.some(c=>c.id===hash)) select.value=hash;
    renderCatalogDetail(select.value);
    select.addEventListener('change', e=>renderCatalogDetail(e.target.value));
  }
  qsa('.cat-tabs [data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    qsa('.cat-tabs [data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter || 'all';
    qsa('#categoryGrid .category-card').forEach(card=>{
      const shouldHide = f !== 'all' && card.dataset.group !== f;
      card.classList.toggle('hide', shouldHide);
      card.hidden = shouldHide;
      card.style.display = shouldHide ? 'none' : '';
    });
  }));
}
const AI_ALLOWED_FILE_EXTENSIONS = ['pdf','doc','docx','xls','xlsx','dwg','jpg','jpeg','png','zip'];
const AI_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;
const AI_UPLOAD_MAX_FILES = 3;
function normalizeDraftFiles(files){
  if(typeof files === 'string'){
    try{ files = JSON.parse(files); }catch{ files = []; }
  }
  if(!Array.isArray(files)) return [];
  return files.map(file=>({
    id:String(file?.id || '').trim().slice(0,120),
    name:String(file?.name || '').replace(/\s+/g,' ').trim().slice(0,180),
    url:String(file?.url || '').trim().slice(0,520),
    size:Number(file?.size) || 0,
    ocrStatus:String(file?.ocrStatus || file?.ocr_status || '').trim().slice(0,80),
    extractedText:String(file?.extractedText || file?.extracted_text || file?.text || '').replace(/\r/g,'').trim().slice(0,4000)
  })).filter(file=>file.id && file.name && /^https?:\/\//i.test(file.url)).slice(0,AI_UPLOAD_MAX_FILES);
}
function formatFileSize(bytes){
  const size = Number(bytes) || 0;
  if(size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`;
  if(size >= 1024) return `${Math.max(1, Math.round(size / 1024))} КБ`;
  return `${size} Б`;
}
function appendFilesBlock(message, files){
  const list = normalizeDraftFiles(files);
  const base = String(message || '').trim();
  if(!list.length) return base;
  const lines = ['Файлы из AI-чата:', ...list.map(file=>`- ${file.name} — ${file.url}`)];
  const extracted = buildFilesExtractedText(list);
  const existing = base
    .split('Файлы из AI-чата:')[0]
    .split('Распознанный текст из файлов:')[0]
    .trim();
  const blocks = [lines.join('\n')];
  if(extracted) blocks.push(`Распознанный текст из файлов:\n${extracted}`);
  return `${existing}${existing ? '\n\n' : ''}${blocks.join('\n\n')}`.trim();
}
function removeExactTextBlock(source, block){
  const text = String(source || '').replace(/\r\n/g, '\n').trim();
  const target = String(block || '').replace(/\r\n/g, '\n').trim();
  if(!target) return text;
  if(text === target) return '';
  const index = text.indexOf(target);
  if(index < 0) return text;
  const before = text.slice(0, index).trim();
  const after = text.slice(index + target.length).trim();
  return [before, after].filter(Boolean).join('\n\n').trim();
}
function buildFilesExtractedText(files){
  return normalizeDraftFiles(files)
    .filter(file=>file.extractedText)
    .map(file=>`${file.name}:\n${file.extractedText}`)
    .join('\n\n')
    .trim();
}
function isGenericAiFileMessage(message){
  const text = String(message || '').replace(/\s+/g,' ').trim().toLowerCase();
  return !text || /^файл[ы]? из ai-чата\b/.test(text) || /^файл[ы]? прикреп/.test(text);
}
function buildChatContextMessage(text, files){
  const clean = String(text || '').replace(/\s+/g,' ').trim();
  const count = normalizeDraftFiles(files).length;
  const extracted = buildFilesExtractedText(files);
  const parts = [];
  if(clean) parts.push(`Комментарий из чата:\n${clean}`);
  else if(count) parts.push(`Файлы из AI-чата для разбора менеджером. Прикреплено файлов: ${count}.`);
  if(extracted) parts.push(`Распознанный текст из файлов:\n${extracted}`);
  return parts.join('\n\n').trim();
}
function hasLeadMaterialSignal(text){
  return /(осп|osb|ultralam|ультралам|кирпич|гкл|гклв|гипсокартон|фанер|дсп|лдсп|сервер|коммутатор|схд|кабель|насос|арматур|светильник|плит|фасад|кровл)/iu.test(String(text || ''));
}
function isWeakLeadManagerMessage(message, chatText){
  const clean = String(message || '').replace(/\s+/g,' ').trim();
  const source = String(chatText || '').replace(/\s+/g,' ').trim();
  if(!clean) return true;
  if(isGenericAiFileMessage(clean)) return true;
  if(/^\d+\s+(?:фур|фуры|фура|машин|машины|машина|паллет|паллеты|тонн|тонны|штук|шт)\.?$/iu.test(clean)) return true;
  if(source.length > clean.length + 18 && hasLeadMaterialSignal(source) && !hasLeadMaterialSignal(clean)) return true;
  return clean.length < 18 && source.length > clean.length + 12;
}
function getAiApiEndpoint(path){
  const endpointPath = String(path || '');
  const host = location.hostname;
  if(host === '72.56.97.96' || host.endsWith('pnp1.ru')) return endpointPath;
  return `https://api.pnp1.ru${endpointPath}`;
}
function validateLeadUploadFile(file){
  if(!file) return '';
  const allowed = ['pdf','doc','docx','xls','xlsx','dwg','jpg','jpeg','png','zip'];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(!allowed.includes(ext)) return 'Поддерживаем PDF, DOC, XLS, DWG, JPG, PNG и ZIP.';
  if(file.size > AI_UPLOAD_MAX_BYTES) return 'Файл больше 30 МБ. Уменьшите файл или отправьте архив до 30 МБ.';
  return '';
}
async function uploadLeadFormFile(file){
  const error = validateLeadUploadFile(file);
  if(error) throw new Error(error);
  const data = new FormData();
  data.append('file', file);
  const response = await fetch(getAiApiEndpoint('/api/ai-upload'), {method:'POST', body:data});
  const payload = await response.json().catch(()=>({}));
  if(!response.ok || !payload.file) throw new Error(payload.error || 'upload_failed');
  return payload.file;
}
async function uploadLeadFormFiles(files){
  const selected = Array.from(files || []).slice(0, AI_UPLOAD_MAX_FILES);
  const uploaded = [];
  for(const file of selected){
    uploaded.push(await uploadLeadFormFile(file));
  }
  return uploaded;
}
function leadSummaryFromMessage(message){
  return String(message || '').replace(/\s+/g,' ').trim().slice(0,360);
}
function normalizeLeadDraft(draft){
  if(!draft || typeof draft !== 'object') return null;
  const name = String(draft.name || draft.company || '').replace(/\s+/g,' ').trim().slice(0,180);
  const phone = String(draft.phone || '').replace(/\s+/g,' ').trim().slice(0,80);
  const email = String(draft.email || '').replace(/\s+/g,' ').trim().slice(0,120);
  const category = String(draft.category || '').replace(/\s+/g,' ').trim();
  const city = String(draft.city || '').replace(/\s+/g,' ').trim().slice(0,120);
  const object = String(draft.object || (city ? (/^г\.?\s/i.test(city) ? city : `г. ${city}`) : '')).replace(/\s+/g,' ').trim();
  const message = String(draft.message || draft.comment || draft.summary || '').trim();
  const files = normalizeDraftFiles(draft.files || draft.ai_files);
  const channel = String(draft.channel || draft.source_channel || '').replace(/\s+/g,' ').trim().slice(0,80);
  const page = String(draft.page || draft.source_page || '').replace(/\s+/g,' ').trim().slice(0,500);
  if(!name && !phone && !email && !category && !object && !city && !message && !files.length) return null;
  return {
    name,
    phone,
    email,
    category,
    object,
    city,
    message:message.slice(0,3200),
    summary:leadSummaryFromMessage(message || draft.summary || (files.length ? `Прикреплено файлов: ${files.length}` : '')),
    files,
    channel,
    page
  };
}
function extractLeadPhoneFromText(text){
  const candidates = String(text || '').match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [];
  for(const candidate of candidates){
    const digits = candidate.replace(/\D/g,'');
    if(digits.length === 11 && /^[78]/.test(digits)) return `+7 ${digits.slice(1,4)} ${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9,11)}`;
    if(digits.length === 10) return `+7 ${digits.slice(0,3)} ${digits.slice(3,6)}-${digits.slice(6,8)}-${digits.slice(8,10)}`;
  }
  return '';
}
function extractLeadEmailFromText(text){
  const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].slice(0,120) : '';
}
function extractLeadNameFromText(text){
  const source = String(text || '').replace(/\s+/g,' ').trim();
  const company = source.match(/\b(ООО|АО|ЗАО|ПАО|ИП|ГК|ТД)\s+[«"“]?([А-ЯЁA-Z0-9][А-ЯЁA-Zа-яёa-z0-9 .-]{2,80})/u);
  if(company) return `${company[1]} ${company[2]}`.replace(/[»"“”]+/g,'').trim().slice(0,180);
  const named = source.match(/(?:меня зовут|имя|контакт|компания)\s*[:\-]?\s*([А-ЯЁA-Z][А-ЯЁA-Zа-яёa-z-]{2,24}(?:\s+[А-ЯЁA-Z][А-ЯЁA-Zа-яёa-z-]{2,24}){0,2})/iu);
  return named ? named[1].trim().slice(0,180) : '';
}
function extractLeadContactsFromText(text){
  return {
    name:extractLeadNameFromText(text),
    phone:extractLeadPhoneFromText(text),
    email:extractLeadEmailFromText(text)
  };
}
function leadDraftHasRequest(draft){
  const data = normalizeLeadDraft(draft);
  if(!data) return false;
  if(data.message && !isGenericAiFileMessage(data.message)) return true;
  if(data.files.length) return true;
  return Boolean(data.category && (data.object || data.summary));
}
function getLeadDraftMissingFields(draft){
  const data = normalizeLeadDraft(draft);
  if(!data) return ['запрос', 'имя / компания', 'телефон'];
  const missing = [];
  if(!leadDraftHasRequest(data)) missing.push('запрос');
  if(!data.name) missing.push('имя / компания');
  if(!data.phone) missing.push('телефон');
  return missing;
}
function readLeadDraft(){
  try{return normalizeLeadDraft(JSON.parse(sessionStorage.getItem(AI_LEAD_DRAFT_KEY) || 'null'))}catch{return null}
}
function saveLeadDraft(draft){
  const data = normalizeLeadDraft(draft);
  if(!data) return null;
  try{sessionStorage.setItem(AI_LEAD_DRAFT_KEY, JSON.stringify(data))}catch{}
  return data;
}
function goToLeadFormWithDraft(draft){
  const data = saveLeadDraft(draft);
  if(!data) return;
  if(location.pathname.endsWith('/contacts.html') || location.pathname.endsWith('/contacts')){
    window.dispatchEvent(new CustomEvent('pnp:apply-ai-lead-draft', {detail:data}));
    qs('#request-form')?.scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }
  location.href='/contacts#request-form';
}
function initForm(){
  const form=qs('#leadForm'); if(!form) return;
  ensureLeadFormConsent(form);
  const status=qs('[data-form-status]');
  const submit=qs('[type="submit"]', form);
  const fileInput=qs('#specification', form);
  const fileLabel=qs('[data-file-label]', form);
  const uploadBox=qs('.upload-box[for="specification"]', form);
  let aiFilesInput=qs('#ai_files', form);
  if(!aiFilesInput){
    aiFilesInput=document.createElement('input');
    aiFilesInput.type='hidden';
    aiFilesInput.id='ai_files';
    aiFilesInput.name='ai_files';
    form.appendChild(aiFilesInput);
  }
  let currentAiFiles = normalizeDraftFiles(readLeadDraft()?.files);
  const defaultSubmitLabel=submit?.dataset.submitLabel || submit?.textContent || 'Отправить заявку →';
  const syncAiFilesInput=files=>{
    currentAiFiles = normalizeDraftFiles(files);
    if(aiFilesInput) aiFilesInput.value = currentAiFiles.length ? JSON.stringify(currentAiFiles) : '';
  };
  syncAiFilesInput(currentAiFiles);
  let catalogReturnLink = null;
  const ensureCatalogReturnLink = ()=>{
    if(catalogReturnLink) return catalogReturnLink;
    const messageField = qs('#message', form);
    const messageFieldWrap = messageField?.closest('.field');
    if(!messageFieldWrap) return null;
    catalogReturnLink = document.createElement('a');
    catalogReturnLink.className = 'catalog-return-link';
    catalogReturnLink.href = '/catalog';
    catalogReturnLink.hidden = true;
    catalogReturnLink.innerHTML = '<span aria-hidden="true">←</span><b>Вернуться в каталог</b><small>добавить или убрать позиции</small>';
    messageFieldWrap.appendChild(catalogReturnLink);
    return catalogReturnLink;
  };
  const syncCatalogReturnLink = data=>{
    const link = ensureCatalogReturnLink();
    if(!link) return;
    const fromCatalog = Boolean(data && (
      /(^|\/)(catalog|solution-)/.test(String(data.page || '')) ||
      String(data.channel || '').toLowerCase().includes('каталог') ||
      String(data.message || '').trim().toLowerCase().startsWith('заявка из каталога')
    ));
    if(!fromCatalog){
      link.hidden = true;
      return;
    }
    link.href = data.page || '/catalog';
    link.hidden = false;
  };
  const setStatus=(message,type='')=>{
    if(!status) return;
    status.textContent=message;
    status.classList.toggle('success', type==='success');
    status.classList.toggle('error', type==='error');
  };
  const applyLeadDraft = draft=>{
    const data = normalizeLeadDraft(draft);
    if(!data) return false;
    const category = qs('#category', form);
    const object = qs('#object', form);
    const message = qs('#message', form);
    if(category && data.category){
      const option = qsa('option', category).find(item=>item.textContent.trim().toLowerCase() === data.category.toLowerCase());
      if(option) category.value = option.value;
    }
    if(object && data.object){
      let previousObject = '';
      try{ previousObject = sessionStorage.getItem(AI_LAST_APPLIED_OBJECT_KEY) || ''; }catch{}
      if(!object.value.trim() || object.value.trim() === previousObject) object.value = data.object;
      try{ sessionStorage.setItem(AI_LAST_APPLIED_OBJECT_KEY, data.object); }catch{}
    }
    if(message){
      let previousAiComment = '';
      try{ previousAiComment = sessionStorage.getItem(AI_LAST_APPLIED_COMMENT_KEY) || ''; }catch{}
      const manualComment = removeExactTextBlock(message.value, previousAiComment);
      const nextAiComment = appendFilesBlock(data.message || '', data.files);
      if(nextAiComment){
        message.value = [manualComment, nextAiComment].filter(Boolean).join('\n\n');
        try{ sessionStorage.setItem(AI_LAST_APPLIED_COMMENT_KEY, nextAiComment); }catch{}
      }else{
        message.value = manualComment;
        try{ sessionStorage.removeItem(AI_LAST_APPLIED_COMMENT_KEY); }catch{}
      }
    }
    syncAiFilesInput(data.files);
    syncCatalogReturnLink(data);
    form.classList.add('has-ai-draft');
    setStatus('Черновик из AI-чата перенесён. Добавьте имя и контакт, затем отправьте заявку.', 'success');
    trackPnpEvent('ai_lead_draft_applied', { category:data.category || '' });
    return true;
  };
  const savedDraft = readLeadDraft();
  if(savedDraft) setTimeout(()=>applyLeadDraft(savedDraft), 80);
  window.addEventListener('pnp:apply-ai-lead-draft', event=>applyLeadDraft(event.detail));
  if(fileInput && uploadBox){
    uploadBox.addEventListener('click', event=>{
      event.preventDefault();
      fileInput.click();
    });
  }
  if(fileInput && fileLabel){
    fileInput.addEventListener('change', ()=>{
      const files=Array.from(fileInput.files || []);
      if(files.length > AI_UPLOAD_MAX_FILES){
        setStatus(`Можно приложить до ${AI_UPLOAD_MAX_FILES} файлов. Оставил первые ${AI_UPLOAD_MAX_FILES}.`, 'error');
      }else{
        setStatus('');
      }
      if(!files.length){
        fileLabel.textContent='Прикрепить файл / спецификацию';
      }else if(files.length === 1){
        fileLabel.textContent=`Выбран файл: ${files[0].name}`;
      }else{
        fileLabel.textContent=`Выбрано файлов: ${Math.min(files.length, AI_UPLOAD_MAX_FILES)}`;
      }
    });
  }
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const draftBeforeSubmit = readLeadDraft();
    const aiFiles = normalizeDraftFiles(currentAiFiles.length ? currentAiFiles : draftBeforeSubmit?.files);
    const messageField = qs('#message', form);
    if(messageField && aiFiles.length) messageField.value = appendFilesBlock(messageField.value, aiFiles);
    syncAiFilesInput(aiFiles);
    const d=new FormData(form);
    const phone=String(d.get('phone')||'').trim();
    const email=String(d.get('email')||'').trim();
    const consent=qs('[name="privacy_consent"]', form);
    if(consent && !consent.checked){
      trackPnpEvent('lead_form_validation_error', { reason:'missing_privacy_consent' });
      setStatus('Подтвердите согласие на обработку данных, чтобы отправить заявку.', 'error');
      consent.focus();
      return;
    }
    if(!phone){
      trackPnpEvent('lead_form_validation_error', { reason:'missing_phone' });
      setStatus('Укажите телефон, чтобы CRM-форма приняла заявку и менеджер мог связаться с вами.', 'error');
      qs('#phone', form)?.focus();
      return;
    }
    trackPnpEvent('lead_form_submit_attempt', {
      category:String(d.get('category')||''),
      has_file:!!(fileInput && fileInput.files && fileInput.files.length)
    });
    d.set('form-name', form.getAttribute('name') || 'lead');
    setStatus('');
    if(submit){
      submit.disabled=true;
      submit.textContent='Отправляем заявку...';
    }
    try{
      let formUploadedFiles = [];
      const selectedFormFiles = fileInput && fileInput.files && fileInput.files.length ? Array.from(fileInput.files).slice(0, AI_UPLOAD_MAX_FILES) : [];
      if(selectedFormFiles.length){
        setStatus(selectedFormFiles.length === 1 ? 'Загружаем файл и собираем заявку...' : `Загружаем файлы (${selectedFormFiles.length}) и собираем заявку...`);
        formUploadedFiles = await uploadLeadFormFiles(selectedFormFiles);
      }
      const leadFiles = normalizeDraftFiles(aiFiles.concat(formUploadedFiles));
      syncAiFilesInput(leadFiles);
      const leadPayload = {
        name:String(d.get('name')||''),
        phone:String(d.get('phone')||''),
        email:String(d.get('email')||''),
        category:String(d.get('category')||''),
        object:String(d.get('object')||''),
        message:String(d.get('message')||''),
        page:location.href,
        channel:'Форма сайта',
        leadDraft:draftBeforeSubmit || null,
        files:leadFiles
      };
      const response=await fetch(getAiApiEndpoint('/api/bitrix-form-submit'), {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(leadPayload)
      });
      const payload = await response.json().catch(()=>({}));
      if(!response.ok || !payload.bitrix_form_sent) throw new Error(payload.error || payload.bitrix_form_error || 'bitrix_form_submit_failed');
      if(typeof trackPnpEvent === 'function') trackPnpEvent('lead_submit_result', {
        bitrix_form_sent:!!payload.bitrix_form_sent,
        bitrix_form_result_id:payload.bitrix_form_result_id || ''
      });
      form.reset();
      try{ sessionStorage.removeItem(AI_LEAD_DRAFT_KEY); }catch{}
      try{ sessionStorage.removeItem(AI_LAST_APPLIED_COMMENT_KEY); }catch{}
      try{ sessionStorage.removeItem(AI_LAST_APPLIED_OBJECT_KEY); }catch{}
      syncAiFilesInput([]);
      syncCatalogReturnLink(null);
      if(fileLabel) fileLabel.textContent='Прикрепить файл / спецификацию';
      setStatus('Заявка отправлена. Мы свяжемся с вами по указанным контактам.', 'success');
      trackPnpEvent('lead_form_submit_success', { category:String(d.get('category')||'') });
    }catch(err){
      setStatus(`Не удалось отправить автоматически. Напишите на ${SITE.email} или позвоните ${SITE.phone}.`, 'error');
      trackPnpEvent('lead_form_submit_error', { category:String(d.get('category')||'') });
    }finally{
      if(submit){
        submit.disabled=false;
        submit.textContent=defaultSubmitLabel;
      }
    }
  });
}
function trackPnpEvent(name, detail={}){
  const payload = {
    event:`pnp_${name}`,
    page:location.pathname || '/',
    path:location.pathname + location.search,
    ...detail
  };
  window.pnpAnalyticsEvents = window.pnpAnalyticsEvents || [];
  window.pnpAnalyticsEvents.push(payload);
  if(Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent('pnp:analytics', { detail:payload }));
}
function initAnalytics(){
  const readableLabel = el => (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g,' ').trim();
  qsa('a[href*="/contacts#request-form"], a[href*="contacts.html#request-form"], .header-action-request').forEach(el=>{
    el.addEventListener('click',()=>trackPnpEvent('cta_request_click', {
      label:readableLabel(el),
      href:el.getAttribute('href') || ''
    }));
  });
  qsa('[data-phone-href]').forEach(el=>{
    el.addEventListener('click',()=>trackPnpEvent('phone_click', { label:readableLabel(el) || SITE.phone }));
  });
  qsa('[data-email-href]').forEach(el=>{
    el.addEventListener('click',()=>trackPnpEvent('email_click', { label:readableLabel(el) || SITE.email }));
  });
  qsa('.mega-menu a').forEach(el=>{
    el.addEventListener('click',()=>trackPnpEvent('mega_menu_click', {
      label:readableLabel(el),
      href:el.getAttribute('href') || '',
      menu:el.closest('.mega-menu')?.id || ''
    }));
  });
  qsa('[data-partner-filter]').forEach(el=>{
    el.addEventListener('click',()=>trackPnpEvent('partner_filter_click', {
      filter:el.dataset.partnerFilter || readableLabel(el)
    }));
  });
  const bindSearch = (selector, eventName) => {
    const el = qs(selector);
    if(!el) return;
    let timer = null;
    el.addEventListener('input',()=>{
      clearTimeout(timer);
      timer = setTimeout(()=>{
        const value = String(el.value || '').trim();
        if(value.length >= 2) trackPnpEvent(eventName, { query:value.slice(0,80) });
      }, 650);
    });
  };
  bindSearch('#partnerSearch', 'partner_search');
  bindSearch('#vendorSearch', 'vendor_search');
}
function syncContacts(){
  qsa('[data-phone]').forEach(e=>e.textContent=SITE.phone);
  qsa('[data-phone-href]').forEach(e=>e.href='tel:'+SITE.phoneHref);
  qsa('[data-email]').forEach(e=>e.textContent=SITE.email);
  qsa('[data-email-href]').forEach(e=>e.href='mailto:'+SITE.email);
  qsa('[data-website]').forEach(e=>e.textContent=SITE.website);
  qsa('[data-website-href]').forEach(e=>e.href='https://'+SITE.website);
  qsa('[data-address]').forEach(e=>e.textContent=SITE.address);
}
function initLegalFooterLinks(){
  qsa('.footer-inner').forEach(footer=>{
    if(qs('.footer-legal-links', footer)) return;
    const legal = document.createElement('span');
    legal.className = 'footer-legal-links';
    legal.innerHTML = '<a href="/privacy">Политика обработки данных</a><span aria-hidden="true">·</span><a href="/consent">Согласие на обработку данных</a>';
    footer.appendChild(legal);
  });
}
function ensureLeadFormConsent(form){
  if(!form || qs('[name="privacy_consent"]', form)) return;
  const oldNote = qs('.form-consent', form);
  if(oldNote && !oldNote.querySelector('input')) oldNote.remove();
  const submitButton = qs('[type="submit"]', form);
  const label = document.createElement('label');
  label.className = 'form-consent form-consent-check';
  label.innerHTML = '<input type="checkbox" name="privacy_consent" value="yes" required><span>Согласен на обработку персональных данных для подготовки ответа по заявке. <a href="/privacy" target="_blank" rel="noopener noreferrer">Политика</a> · <a href="/consent" target="_blank" rel="noopener noreferrer">Согласие</a></span>';
  if(submitButton) submitButton.insertAdjacentElement('beforebegin', label);
  else form.appendChild(label);
}

function normalizeSearch(value){
  return String(value || '').toLowerCase().replace(/ё/g,'е').trim();
}

function uniqueBrandsFromRows(rows=getAllVendorRows()){
  const set = new Set();
  rows.forEach(row => (row.brands||[]).forEach(brand => set.add(vendorBrandName(brand))));
  return [...set].sort((a,b)=>a.localeCompare(b,'ru'));
}
function rowsForDirection(direction){
  return getAllVendorRows().filter(row => row.group === direction);
}
function renderAllManufacturersPreview(rows=getAllVendorRows(), query='', isFiltered=false){
  const el = qs('#allManufacturerChips'); if(!el) return;
  const q = normalizeSearch(query);
  if(!q && !isFiltered){
    el.innerHTML = `<span class="vendor-chip more">Выберите направление или начните поиск — покажем только релевантных производителей без длинной общей ленты.</span>`;
    return;
  }
  const all = uniqueBrandsFromRows(rows);
  const visible = q ? all.filter(brand => normalizeSearch(brand).includes(q)) : all;
  const limit = q ? 240 : 80;
  if(!visible.length){
    el.innerHTML = `<span class="vendor-chip more">Ничего не найдено. Отправьте спецификацию — проверим бренд и предложим замену.</span>`;
    return;
  }
  el.innerHTML = visible.slice(0,limit).map(brand=>`<button class="vendor-chip strong" type="button" data-brand-chip="${brand}">${brand}</button>`).join('') +
    (visible.length > limit ? `<span class="vendor-chip more">+ ещё ${visible.length-limit} производителей</span>` : '');
  qsa('[data-brand-chip]', el).forEach(chip=>chip.addEventListener('click',()=>{
    const search = qs('#vendorSearch');
    if(search){ search.value = chip.dataset.brandChip || chip.textContent; search.dispatchEvent(new Event('input')); search.focus(); }
  }));
}
const vendorDirectionVisuals = {
  'Архитектурные решения': {
    title: 'Архитектурные решения',
    photo: 'assets/img/solutions/detail/architecture/architecture-aluminum-cassettes.webp',
    icon: 'assets/img/vendors/mini-cards/architecture.svg',
    brands: ['Албес', 'Board', 'Авансум']
  },
  'Конструктивные решения': {
    title: 'Конструктивные решения',
    photo: 'assets/img/solutions/detail/constructive/constructive-brick-v12.webp',
    icon: 'assets/img/vendors/mini-cards/constructive.svg',
    brands: ['ЛСР', 'BRAER', 'Технониколь']
  },
  'ЭОМ': {
    title: 'ЭОМ',
    photo: 'assets/img/solutions/detail/eom/v12/eom-cable-trays-metal.webp',
    icon: 'assets/img/vendors/mini-cards/eom.svg',
    brands: ['DKC', 'IEK', 'EKF']
  },
  'Водоснабжение и водоотведение': {
    title: 'ВК/ВВ',
    photo: 'assets/img/solutions/detail/water/v12/water-valves-v12.webp',
    icon: 'assets/img/vendors/mini-cards/water.svg',
    brands: ['Wilo', 'Ридан', 'REHAU']
  },
  'ОВиК и тепловые сети': {
    title: 'ОВиК',
    photo: 'assets/img/solutions/detail/hvac/v12/hvac-air-ducts-v12.webp',
    icon: 'assets/img/vendors/mini-cards/hvac.svg',
    brands: ['KORF', 'Ридан', 'DAIKIN']
  },
  'Пожарная безопасность': {
    title: 'Пожарная безопасность',
    photo: 'assets/img/solutions/detail/fire/v12/fire-sprinkler-water-v12.webp',
    icon: 'assets/img/vendors/mini-cards/fire.svg',
    brands: ['Рубеж', 'Аргус-Спектр', 'АСТ Пирохимика']
  },
  'Слаботочные сети и связь': {
    title: 'Слаботочные сети',
    photo: 'assets/img/solutions/detail/low-current/v12/low-current-cctv-v12.webp',
    icon: 'assets/img/vendors/mini-cards/low-current.svg',
    brands: ['Dahua', 'HikVision', 'Eltex']
  },
  'IT-инфраструктура': {
    title: 'IT-инфраструктура',
    photo: 'assets/img/solutions/photo/it-infrastructure.webp',
    icon: 'assets/img/vendors/mini-cards/it-infrastructure.svg',
    brands: ['DEPO Computers', 'YADRO', 'KVADRA']
  },
  'Газоснабжение': {
    title: 'Газоснабжение',
    photo: 'assets/img/solutions/detail/gas/gas-analyzers.webp',
    icon: 'assets/img/vendors/mini-cards/gas.svg',
    brands: ['ГазоАнализ']
  },
  'Вертикальный транспорт': {
    title: 'Вертикальный транспорт',
    photo: 'assets/img/solutions/detail/vertical-transport/vertical-elevators.webp',
    icon: 'assets/img/vendors/mini-cards/vertical-transport.svg',
    brands: ['ЩЛЗ', 'МОСЛИФТ', 'Лифтпром']
  },
  'Технологическое оборудование': {
    title: 'Технологическое оборудование',
    photo: 'assets/img/solutions/detail/tech-equipment/tech-inspection.webp',
    icon: 'assets/img/vendors/mini-cards/tech-equipment.svg',
    brands: ['Samsung', 'Philips', 'Drager']
  },
  'Доступная среда': {
    title: 'Доступная среда',
    photo: 'assets/img/solutions/detail/accessibility/accessibility-ramps.webp',
    icon: 'assets/img/vendors/mini-cards/accessibility.svg',
    brands: ['Тифлоцентр', 'Veara', 'Лазер-НН']
  }
};
function pickDirectionBrands(direction, brands){
  const preferred = (vendorDirectionVisuals[direction] && vendorDirectionVisuals[direction].brands) || [];
  const picked = [];
  preferred.forEach(name => {
    const found = brands.find(brand => normalizeSearch(brand).includes(normalizeSearch(name)));
    if((found || picked.length < 3) && !picked.some(item => normalizeSearch(item) === normalizeSearch(name))) picked.push(name);
  });
  brands
    .filter(brand => brand.length <= 18 && !picked.some(item => normalizeSearch(brand).includes(normalizeSearch(item)) || normalizeSearch(item).includes(normalizeSearch(brand))))
    .forEach(brand => { if(picked.length < 3) picked.push(brand); });
  brands
    .filter(brand => !picked.some(item => normalizeSearch(brand).includes(normalizeSearch(item)) || normalizeSearch(item).includes(normalizeSearch(brand))))
    .forEach(brand => { if(picked.length < 3) picked.push(brand); });
  return picked.slice(0,3);
}
function scrollToVendorRowsSection(options={}){
  const target = qs('#vendorRowsSection');
  if(!target) return;
  const topbar = qs('.topbar');
  const offset = Math.ceil((topbar ? topbar.getBoundingClientRect().height : 78) + 18);
  const top = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - offset);
  window.scrollTo({top, behavior:options.smooth ? 'smooth' : 'auto'});
}
function renderDirectionCards(){
  const el = qs('#vendorDirectionCards'); if(!el) return;
  const allVendorRows = getAllVendorRows();
  const order = (typeof vendorDirectionOrder !== 'undefined' ? vendorDirectionOrder : [...new Set(allVendorRows.map(r=>r.group))]);
  el.innerHTML = order.map(direction=>{
    const rows = rowsForDirection(direction);
    const brands = uniqueBrandsFromRows(rows);
    const visual = vendorDirectionVisuals[direction] || {};
    const topBrands = pickDirectionBrands(direction, brands);
    const types = [...new Set(rows.map(r=>r.type || r.area).filter(Boolean))];
    const info = (typeof vendorDirectionInfo !== 'undefined' && vendorDirectionInfo[direction]) ? vendorDirectionInfo[direction] : {icon:'•', text:'Производители и товарные группы по направлению.', positions:types.slice(0,4)};
    const photoUrl = visual.photo ? `/${String(visual.photo).replace(/^\/+/, '')}` : '';
    const style = photoUrl ? ` style="--direction-photo:url('${photoUrl}')"` : '';
    const icon = visual.icon ? `<img src="${visual.icon}" alt="" loading="lazy">` : `<span></span>`;
    return `<article class="vendor-direction-card" data-direction="${direction}"${style}>
      ${visual.photo ? `<img class="vendor-direction-photo-bg" src="${visual.photo}" alt="" loading="lazy" aria-hidden="true">` : ''}
      <div class="vendor-direction-top"><i aria-hidden="true">${icon}</i><span>${rows.length} групп · ${brands.length}+ производителей</span></div>
      <h3>${direction}</h3>
      <p>${info.text}</p>
      <div class="direction-position-list">${(info.positions||types).slice(0,4).map(p=>`<b>${p}</b>`).join('')}</div>
      <div class="vendor-brands mini">${topBrands.map(b=>renderVendorLogoChip(vendorBrandName(b))).join('')}</div>
      <a class="link-more" href="#vendorRowsSection" data-vendor-filter="${direction}">Смотреть производителей →</a>
    </article>`;
  }).join('');
  qsa('[data-vendor-filter]', el).forEach(link=>link.addEventListener('click', e=>{
    e.preventDefault();
    const select = qs('#vendorSection');
    if(select){ select.value = link.dataset.vendorFilter; select.dispatchEvent(new Event('change')); }
    if(history.pushState){
      const url = new URL(location.href);
      url.searchParams.set('vendorDirection', link.dataset.vendorFilter || '');
      url.hash = 'vendorRowsSection';
      history.pushState(null, '', url.href);
    }
    requestAnimationFrame(()=>scrollToVendorRowsSection({smooth:true}));
  }));
}
function renderVendorPage(){
  const rowsEl=qs('#vendorRows'); if(!rowsEl) return;
  const blockSelect=qs('#vendorBlock');
  const select=qs('#vendorSection');
  const systemSelect=qs('#vendorSystem');
  const productSelect=qs('#vendorProduct');
  const search=qs('#vendorSearch');
  const count=qs('#vendorCount');
  const allVendorRows = getAllVendorRows();
  renderAllManufacturersPreview();
  renderDirectionCards();
  const sections=(typeof vendorDirectionOrder !== 'undefined' ? vendorDirectionOrder : [...new Set(allVendorRows.map(r=>r.group))]).filter(s=>allVendorRows.some(r=>r.group===s));
  let activeScope = vendorScopeFromUrl();
  if(activeScope && !vendorScopeById(activeScope)) activeScope = '';
  const initialDirection = vendorDirectionFromUrl(sections);
  const initialSearch = vendorSearchFromUrl();
  let filters = {
    block:vendorFilterFromUrl(allVendorRows, 'block', 'vendorBlock'),
    direction:initialDirection || 'all',
    system:vendorFilterFromUrl(allVendorRows, 'system', 'vendorSystem'),
    product:vendorFilterFromUrl(allVendorRows, 'product', 'vendorProduct')
  };
  if(initialDirection && select){
    activeScope = '';
    if(search) search.value = '';
  } else if(activeScope && select){
    filters = {block:'all', direction:'all', system:'all', product:'all'};
    if(search) search.value = '';
  } else if(initialSearch && search){
    search.value = initialSearch;
  }
  function optionRowsIgnoring(key){
    const scoped = activeScope && vendorScopeById(activeScope)
      ? allVendorRows.filter(row => vendorScopeById(activeScope).directions.includes(row.group))
      : allVendorRows;
    const partial = {...filters, [key]:'all'};
    return vendorRowsByFilters(scoped, partial, search ? search.value : '');
  }
  function syncFilterControls(){
    const blockValues = uniqueVendorValues(optionRowsIgnoring('block'), 'block');
    setSelectOptions(blockSelect, blockValues, 'Все блоки', filters.block);
    filters.block = blockSelect ? blockSelect.value : filters.block;
    const directionValues = uniqueVendorValues(optionRowsIgnoring('direction'), 'direction');
    setSelectOptions(select, directionValues, 'Все направления', filters.direction);
    filters.direction = select ? select.value : filters.direction;
    const systemValues = uniqueVendorValues(optionRowsIgnoring('system'), 'system');
    setSelectOptions(systemSelect, systemValues, 'Все системы', filters.system);
    filters.system = systemSelect ? systemSelect.value : filters.system;
    const productValues = uniqueVendorValues(optionRowsIgnoring('product'), 'product');
    setSelectOptions(productSelect, productValues, 'Все товарные группы', filters.product);
    filters.product = productSelect ? productSelect.value : filters.product;
  }
  function writeVendorUrl(){
    if(!history.replaceState) return;
    const url = new URL(location.href);
    [
      ['vendorBlock', filters.block],
      ['vendorDirection', filters.direction],
      ['vendorSystem', filters.system],
      ['vendorProduct', filters.product],
      ['vendorSearch', search ? search.value.trim() : '']
    ].forEach(([key,value])=>{
      if(value && value !== 'all') url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    url.searchParams.delete('vendorScope');
    history.replaceState(null, '', url.href);
  }
  function renderVendorRow(row){
    const block = vendorRowValue(row,'block');
    const direction = vendorRowValue(row,'direction');
    const system = vendorRowValue(row,'system');
    const product = vendorRowValue(row,'product');
    const path = [direction, system].filter(Boolean).join(' · ');
    return `<article class="vendor-row">
      <div class="vendor-meta">
        <span>${escapeHtml(block || direction || 'Производители')}</span>
        <b>${escapeHtml(product || system || direction)}</b>
        <small>${escapeHtml(path || block || 'Связь с каталогом уточняется')}</small>
      </div>
      <div class="vendor-brands">${renderVendorBrandList(row)}</div>
    </article>`;
  }
  function render(){
    const q=normalizeSearch(search?search.value:'');
    const scope = activeScope ? vendorScopeById(activeScope) : null;
    const scopeDirections = scope ? scope.directions : [];
    syncFilterControls();
    const baseRows = scope ? allVendorRows.filter(row => scopeDirections.includes(row.group)) : allVendorRows;
    const hasActiveFilter = Boolean(scope) || Object.values(filters).some(value=>value && value !== 'all') || Boolean(q);
    const filtered=vendorRowsByFilters(baseRows, filters, search ? search.value : '');
    const brandCount = uniqueBrandsFromRows(filtered).length;
    renderAllManufacturersPreview(filtered, q, Boolean(scope) || Object.values(filters).some(value=>value && value !== 'all'));
    if(count){
      const totalText = hasActiveFilter
        ? `Найдено: ${filtered.length} групп · ${brandCount}+ производителей${scope ? ` · ${scope.title}` : ''}`
        : 'Выберите направление или начните поиск';
      count.textContent=totalText;
    }
    if(!hasActiveFilter){
      rowsEl.innerHTML = `<article class="vendor-row empty-row"><div class="vendor-meta"><span>База производителей</span><b>Список скрыт до выбора</b><small>Выберите направление выше или начните поиск по бренду, производителю или типу оборудования. Так страница остаётся компактной, а клиент видит только нужную часть базы.</small></div></article>`;
      return;
    }
    rowsEl.innerHTML=filtered.length ? filtered.map(renderVendorRow).join('') : `<article class="vendor-row empty-row"><div class="vendor-meta"><span>Поиск</span><b>Ничего не найдено</b><small>Отправьте спецификацию — проверим бренд вручную и предложим подходящую замену.</small></div></article>`;
  }
  function applyScope(scope, options={}){
    if(!vendorScopeById(scope)) return false;
    activeScope = scope;
    filters = {block:'all', direction:'all', system:'all', product:'all'};
    if(search) search.value = '';
    render();
    if(options.updateUrl && history.pushState){
      const url = new URL(location.href);
      url.searchParams.delete('vendorDirection');
      url.searchParams.set('vendorScope', scope);
      url.hash = 'vendorRowsSection';
      history.pushState(null, '', url.href);
    }
    if(options.scroll){
      requestAnimationFrame(()=>scrollToVendorRowsSection({smooth:options.smooth}));
    }
    return true;
  }
  function applyDirection(direction, options={}){
    const resolved = resolveVendorDirection(direction, sections);
    if(!resolved) return false;
    activeScope = '';
    filters = {block:'all', direction:resolved, system:'all', product:'all'};
    if(search) search.value = '';
    render();
    if(options.updateUrl && history.pushState){
      const url = new URL(location.href);
      url.searchParams.delete('vendorScope');
      url.searchParams.set('vendorDirection', resolved);
      url.hash = 'vendorRowsSection';
      history.pushState(null, '', url.href);
    }
    if(options.scroll){
      requestAnimationFrame(()=>scrollToVendorRowsSection({smooth:options.smooth}));
    }
    return true;
  }
  blockSelect&&blockSelect.addEventListener('change',()=>{
    activeScope = '';
    filters.block = blockSelect.value;
    filters.direction = 'all';
    filters.system = 'all';
    filters.product = 'all';
    render();
    writeVendorUrl();
  });
  select&&select.addEventListener('change',()=>{
    activeScope = '';
    filters.direction = select.value;
    filters.system = 'all';
    filters.product = 'all';
    render();
    writeVendorUrl();
  });
  systemSelect&&systemSelect.addEventListener('change',()=>{
    activeScope = '';
    filters.system = systemSelect.value;
    filters.product = 'all';
    render();
    writeVendorUrl();
  });
  productSelect&&productSelect.addEventListener('change',()=>{
    activeScope = '';
    filters.product = productSelect.value;
    render();
    writeVendorUrl();
  });
  search&&search.addEventListener('input',()=>{
    activeScope = '';
    render();
    writeVendorUrl();
  });
  if(!document.documentElement.dataset.vendorBrandToggleReady){
    document.documentElement.dataset.vendorBrandToggleReady = '1';
    document.addEventListener('click', e=>{
      const button = e.target.closest('[data-vendor-brand-toggle]');
      if(!button) return;
      const list = button.closest('[data-vendor-brand-list]');
      if(!list) return;
      const expanded = list.classList.toggle('is-expanded');
      qsa('[data-vendor-brand-toggle]', list).forEach(toggle=>{
        toggle.textContent = expanded ? toggle.dataset.closeText : toggle.dataset.openText;
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    });
  }
  render();
  if(activeScope){
    applyScope(activeScope);
    requestAnimationFrame(()=>scrollToVendorRowsSection());
  } else if(initialDirection){
    requestAnimationFrame(()=>scrollToVendorRowsSection());
  }
  if(!document.documentElement.dataset.vendorDirectionDelegated){
    document.documentElement.dataset.vendorDirectionDelegated = '1';
    document.addEventListener('click', e=>{
      const scopeLink = e.target.closest('[data-vendor-scope-link]');
      if(scopeLink && isVendorsPage()){
        const scope = scopeLink.dataset.vendorScopeLink || '';
        if(vendorScopeById(scope)){
          e.preventDefault();
          closeHeaderMegaMenus();
          applyScope(scope, {updateUrl:true, scroll:true, smooth:true});
          requestAnimationFrame(closeHeaderMegaMenus);
          setTimeout(closeHeaderMegaMenus, 180);
          return;
        }
      }
      const link = e.target.closest('[data-vendor-direction-link]');
      if(!link || !isVendorsPage()) return;
      const direction = link.dataset.vendorDirectionLink || '';
      if(!resolveVendorDirection(direction, sections)) return;
      e.preventDefault();
      closeHeaderMegaMenus();
      applyDirection(direction, {updateUrl:true, scroll:true, smooth:true});
      requestAnimationFrame(closeHeaderMegaMenus);
      setTimeout(closeHeaderMegaMenus, 180);
    });
    window.addEventListener('popstate',()=>{
      const scope = vendorScopeFromUrl();
      const direction = vendorDirectionFromUrl(sections);
      if(scope && vendorScopeById(scope)) applyScope(scope, {scroll:true});
      else if(direction) applyDirection(direction, {scroll:true});
    });
    window.addEventListener('hashchange',()=>{
      const scope = vendorScopeFromUrl();
      const direction = vendorDirectionFromUrl(sections);
      if(scope && vendorScopeById(scope)) applyScope(scope, {scroll:true});
      else if(direction) applyDirection(direction, {scroll:true});
    });
  }
}

function initPnpLogoVariantPreview(){
  const params = new URLSearchParams(location.search);
  const variant = (params.get('logoVariant') || params.get('pnpLogo') || '').trim().toLowerCase();
  const cleanLogo = 'assets/img/brand/pnp-logo-header-white-clean.png';
  const variants = {
    clean: cleanLogo,
    continuous: cleanLogo,
    split: cleanLogo
  };
  if(!variant || !variants[variant]) return;
  document.documentElement.dataset.pnpLogoVariant = variant;
  qsa('.brand-pnp-clean-img').forEach(img=>{
    img.src = variants[variant];
    img.dataset.pnpLogoVariant = variant;
  });
}

function shouldShowAiChat(){
  const params = new URLSearchParams(window.location.search);
  if(params.get('aiChat') === '0') return false;
  if(localStorage.getItem('pnpAiChat') === '0' || localStorage.getItem('pnpAiChatOff') === '1') return false;
  return true;
}
function getAiChatEndpoint(){
  if(window.PNP_AI_ENDPOINT) return window.PNP_AI_ENDPOINT;
  return getAiApiEndpoint('/api/ai-chat');
}
function readAiBitrixLead(){
  try{
    const data = JSON.parse(sessionStorage.getItem(AI_BITRIX_LEAD_KEY) || 'null');
    const id = String(data?.bitrixId || data?.bitrix_id || '').replace(/\D/g,'');
    return id ? { bitrixId:id, leadId:String(data?.leadId || ''), createdAt:String(data?.createdAt || '') } : null;
  }catch{
    return null;
  }
}
function saveAiBitrixLead(data){
  const id = String(data?.bitrixId || data?.bitrix_id || '').replace(/\D/g,'');
  if(!id) return null;
  const value = {
    bitrixId:id,
    leadId:String(data?.leadId || data?.lead_id || ''),
    createdAt:String(data?.createdAt || new Date().toISOString())
  };
  try{ sessionStorage.setItem(AI_BITRIX_LEAD_KEY, JSON.stringify(value)); }catch{}
  return value;
}
let bitrixSiteButtonPromise = null;
let bitrixLiveChatBridgeReady = false;
let bitrixLiveChatWidget = null;
let bitrixLiveChatWidgetResolver = null;
let bitrixLiveChatPendingContext = null;
function emitBitrixLiveChatEvent(type, detail={}){
  try{
    window.dispatchEvent(new CustomEvent('pnp:bitrix-livechat', {detail:{type, ...detail}}));
  }catch{}
}
function isBitrixRepeatedGreetingText(text){
  const normalized = bitrixChatText(text, 1200);
  if(!normalized) return false;
  const startsAsGreeting = /^Здравствуйте(?:,\s*[^.?!]{2,80})?[.!]?\s+Напишите,\s+что\s+нужно\s+на\s+объект/i.test(normalized);
  const startsAsInstruction = /^Напишите,\s+что\s+нужно\s+на\s+объект/i.test(normalized);
  return (startsAsGreeting || startsAsInstruction)
    && /материал/i.test(normalized)
    && /количество/i.test(normalized)
    && /город/i.test(normalized)
    && /спецификац/i.test(normalized);
}
function replaceBitrixRepeatedGreetingMessages(){
  const selectors = [
    '.bx-messenger-content-item-text-message',
    '.bx-messenger-message .bx-im-message-content-text',
    '.bx-im-message-content-text',
    '.bx-im-message-content-text__container',
    '.bx-im-message-default-content__text',
    '.bx-im-message-base__body [class*="text"]'
  ].join(',');
  qsa(selectors).forEach(element=>{
    if(!element || element.dataset.pnpQueueTextApplied === '1') return;
    if(element.closest('.bx-livechat-help-container, .bx-mobilechat-help-container')) return;
    if(!isBitrixRepeatedGreetingText(element.textContent)) return;
    element.textContent = BITRIX_LIVECHAT_QUEUE_TEXT;
    element.dataset.pnpQueueTextApplied = '1';
  });
}
function polishBitrixLiveChatDom(){
  const hideElement = element=>{
    if(!element) return;
    if(element.classList.contains('b24-widget-button-popup-show')) element.classList.remove('b24-widget-button-popup-show');
    const setImportant = (name, value)=>{
      if(element.style.getPropertyValue(name) !== value || element.style.getPropertyPriority(name) !== 'important'){
        element.style.setProperty(name, value, 'important');
      }
    };
    setImportant('display', 'none');
    setImportant('visibility', 'hidden');
    setImportant('opacity', '0');
    setImportant('pointer-events', 'none');
  };
  const hideClosestWidgetItem = element=>{
    const target = element?.closest?.('.b24-widget-button-social-item, .b24-widget-button-inner-item, .b24-widget-button-block-item, .b24-widget-button-item') || element;
    hideElement(target);
  };
  const isVisible = element=>{
    if(!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0
      && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 1) !== 0;
  };
  const setText = (selector, text)=>{
    qsa(selector).forEach(element=>{
      if(element.textContent !== text) element.textContent = text;
    });
  };
  const ensureHelpSubtitle = (container, text)=>{
    if(!container) return;
    const title = container.querySelector('.bx-livechat-help-title, .bx-mobilechat-help-title');
    if(!title) return;
    let subtitle = container.querySelector('.pnp-bitrix-help-subtitle');
    if(!subtitle){
      subtitle = document.createElement('div');
      subtitle.className = 'pnp-bitrix-help-subtitle';
      title.insertAdjacentElement('afterend', subtitle);
    }
    if(subtitle.textContent !== text) subtitle.textContent = text;
  };
  qsa([
    '.b24-widget-button-popup',
    '.b24-widget-button-popup-triangle',
    '[data-b24-crm-hello-cont]',
    '[class*="crm-hello"]',
    '[class*="widget-button-popup"]'
  ].join(',')).forEach(hideElement);
  qsa([
    '.b24-widget-button-crmform',
    '[data-b24-crm-button-widget="crmform"]',
    '[data-b24-crm-button-widget*="crmform"]',
    '[data-b24-crm-button-widget*="crm_form"]',
    '[data-b24-crm-button-widget*="form"]:not([data-b24-crm-button-widget*="openline"])',
    '.b24-widget-button-social-item.b24-widget-button-crmform'
  ].join(',')).forEach(hideClosestWidgetItem);
  qsa([
    '.bx-imopenlines-form-wrapper',
    '[class*="imopenlines-form-wrapper"]',
    '[class*="livechat-form-wrapper"]',
    '[class*="crmform"]:not([class*="openline"])'
  ].join(',')).forEach(hideElement);
  const liveChatGreetingTitle = bitrixLiveChatGreetingTitle(bitrixLiveChatPendingContext || {});
  const liveChatGreetingSubtitle = liveChatGreetingTitle !== BITRIX_LIVECHAT_HELP_TITLE
    ? BITRIX_LIVECHAT_HELP_SUBTITLE
    : BITRIX_LIVECHAT_HELP_SUBTITLE;
  setText('.bx-livechat-title, .bx-mobilechat-title', BITRIX_LIVECHAT_TITLE);
  setText('.bx-livechat-help-title, .bx-mobilechat-help-title', liveChatGreetingTitle);
  setText('.bx-livechat-help-subtitle, .bx-mobilechat-help-subtitle', BITRIX_LIVECHAT_HELP_SUBTITLE);
  qsa('.bx-livechat-help-container, .bx-mobilechat-help-container').forEach(container=>{
    ensureHelpSubtitle(container, liveChatGreetingSubtitle);
  });
  qsa('.bx-im-textarea-input, textarea[placeholder="Введите сообщение..."]').forEach(element=>{
    if(element.getAttribute('placeholder') !== BITRIX_LIVECHAT_PLACEHOLDER){
      element.setAttribute('placeholder', BITRIX_LIVECHAT_PLACEHOLDER);
    }
  });
  qsa('.bx-livechat-help-user').forEach(element=>{
    if(element.style.getPropertyValue('display') !== 'none' || element.style.getPropertyPriority('display') !== 'important'){
      element.style.setProperty('display', 'none', 'important');
    }
  });
  replaceBitrixRepeatedGreetingMessages();
  const liveChatOpen = qsa('.bx-livechat-wrapper').some(isVisible);
  if(document.body.classList.contains('has-bitrix-livechat-open') !== liveChatOpen){
    document.body.classList.toggle('has-bitrix-livechat-open', liveChatOpen);
  }
}
let bitrixLiveChatPolishReady = false;
function initBitrixLiveChatPolish(){
  if(bitrixLiveChatPolishReady) return;
  bitrixLiveChatPolishReady = true;
  const run = ()=>polishBitrixLiveChatDom();
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style','hidden']});
}
function bitrixChatText(value, max=280){
  return String(value || '').replace(/\s+/g,' ').trim().slice(0,max);
}
function bitrixLiveChatClientFirstName(context={}){
  const storedContactName = typeof readAiContact === 'function' ? readAiContact().name : '';
  const raw = bitrixChatText(context.name || context.leadDraft?.name || storedContactName || '', 120);
  if(!raw || /\d{4,}/.test(raw)) return '';
  const companyPrefixes = /^(ооо|ао|зао|пао|ип|гк|тд|нко|ооо\s+|ао\s+|зао\s+|пао\s+|ип\s+)/i;
  if(companyPrefixes.test(raw)) return '';
  const first = raw
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/\s+/)
    .map(part=>part.trim())
    .find(part=>part.length >= 2 && !companyPrefixes.test(part));
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
}
function bitrixLiveChatGreetingTitle(context={}){
  const firstName = bitrixLiveChatClientFirstName(context);
  return firstName ? `Здравствуйте, ${firstName}` : BITRIX_LIVECHAT_HELP_TITLE;
}
function buildBitrixLiveChatCustomData(context={}){
  const files = normalizeDraftFiles(context.files || context.leadDraft?.files);
  const leadId = bitrixChatText(context.bitrixLeadId || context.bitrix_id || readAiBitrixLead()?.bitrixId, 40);
  const message = bitrixChatText(context.message || context.leadDraft?.message || context.leadDraft?.summary, 900);
  const rows = [
    ['Канал', 'AI-чат сайта'],
    ['Лид Bitrix', leadId ? `#${leadId}` : 'создается / обновляется'],
    ['Направление', context.category || context.leadDraft?.category],
    ['Объект / город', context.object || context.leadDraft?.object],
    ['Суть заявки', message],
    ['Файлы', files.length ? files.map(file=>file.name).join(', ') : 'нет'],
    ['Страница', location.href]
  ].filter(([,value])=>bitrixChatText(value));
  const data = [];
  const name = bitrixChatText(context.name || context.leadDraft?.name, 120);
  const phone = bitrixChatText(context.phone || context.leadDraft?.phone, 80);
  const email = bitrixChatText(context.email || context.leadDraft?.email, 120);
  if(name || phone || email){
    data.push({
      USER:{
        NAME:name || 'Клиент сайта ПНП',
        PHONE:phone,
        EMAIL:email
      }
    });
  }
  if(rows.length){
    data.push({
      GRID:rows.map(([name,value])=>({
        NAME:name,
        VALUE:bitrixChatText(value, name === 'Суть заявки' ? 900 : 220),
        DISPLAY:'LINE'
      }))
    });
  }
  return data;
}
function applyBitrixLiveChatContext(context){
  if(context) bitrixLiveChatPendingContext = context;
  if(!bitrixLiveChatWidget || !bitrixLiveChatPendingContext) return false;
  const customData = buildBitrixLiveChatCustomData(bitrixLiveChatPendingContext);
  if(customData.length && typeof bitrixLiveChatWidget.setCustomData === 'function'){
    try{
      bitrixLiveChatWidget.setCustomData(customData);
      emitBitrixLiveChatEvent('context-applied', {hasLead:Boolean(bitrixLiveChatPendingContext.bitrixLeadId || bitrixLiveChatPendingContext.bitrix_id)});
      return true;
    }catch{}
  }
  return false;
}
function applyBitrixLiveChatLocalize(widget){
  if(!widget || typeof widget.setLocalize !== 'function') return false;
  try{
    const liveChatGreetingTitle = bitrixLiveChatGreetingTitle(bitrixLiveChatPendingContext || {});
    const hasPersonalGreeting = liveChatGreetingTitle !== BITRIX_LIVECHAT_HELP_TITLE;
    widget.setLocalize({
      BX_LIVECHAT_TITLE:BITRIX_LIVECHAT_TITLE,
      BX_LIVECHAT_USER:'менеджер',
      BX_LIVECHAT_ONLINE_LINE_1:hasPersonalGreeting ? liveChatGreetingTitle : BITRIX_LIVECHAT_ONLINE_LINE_1,
      BX_LIVECHAT_ONLINE_LINE_2:hasPersonalGreeting ? BITRIX_LIVECHAT_PERSONAL_LINE_2 : BITRIX_LIVECHAT_ONLINE_LINE_2,
      BX_LIVECHAT_OFFLINE:BITRIX_LIVECHAT_OFFLINE_TEXT,
      BX_LIVECHAT_OFFLINE_TITLE:'Оставьте сообщение для менеджера',
      BX_LIVECHAT_ABOUT_TITLE:'Контакт уже передан из AI-заявки',
      BX_LIVECHAT_ABOUT_RESULT:'Контакт принят.',
      BX_LIVECHAT_FIELD_NAME:'Имя / компания',
      BX_LIVECHAT_FIELD_PHONE:'Телефон',
      BX_MESSENGER_TEXTAREA_PLACEHOLDER:BITRIX_LIVECHAT_PLACEHOLDER
    });
    return true;
  }catch{}
  return false;
}
function initBitrixLiveChatBridge(){
  if(bitrixLiveChatBridgeReady) return;
  bitrixLiveChatBridgeReady = true;
  initBitrixLiveChatPolish();
  window.addEventListener('onBitrixLiveChat', event=>{
    const widget = event?.detail?.widget;
    if(!widget) return;
    bitrixLiveChatWidget = widget;
    if(bitrixLiveChatWidgetResolver){
      bitrixLiveChatWidgetResolver(widget);
      bitrixLiveChatWidgetResolver = null;
    }
    applyBitrixLiveChatLocalize(widget);
    applyBitrixLiveChatContext();
    emitBitrixLiveChatEvent('ready');
    try{
      const type = window.BX?.LiveChatWidget?.SubscriptionType?.every;
      if(typeof widget.subscribe === 'function' && type){
        widget.subscribe({
          type,
          callback:payload=>{
            const eventType = bitrixChatText(payload?.type || payload?.event || payload?.command || 'event', 80);
            emitBitrixLiveChatEvent(eventType, {payload});
          }
        });
      }
    }catch{}
  });
}
function waitForBitrixLiveChatWidget(timeout=6000){
  initBitrixLiveChatBridge();
  if(bitrixLiveChatWidget) return Promise.resolve(bitrixLiveChatWidget);
  return new Promise(resolve=>{
    const started = Date.now();
    const previousResolver = bitrixLiveChatWidgetResolver;
    bitrixLiveChatWidgetResolver = widget=>{
      if(previousResolver) previousResolver(widget);
      resolve(widget);
    };
    const tick = ()=>{
      if(bitrixLiveChatWidget){
        resolve(bitrixLiveChatWidget);
        return;
      }
      if(Date.now() - started > timeout){
        if(bitrixLiveChatWidgetResolver){
          bitrixLiveChatWidgetResolver = previousResolver || null;
        }
        resolve(null);
        return;
      }
      setTimeout(tick, 180);
    };
    tick();
  });
}
function loadBitrixSiteButton(){
  initBitrixLiveChatBridge();
  initBitrixLiveChatPolish();
  if(window.BX || document.querySelector(`script[src^="${BITRIX_SITE_BUTTON_SRC}"]`)) return waitForBitrixSiteButton();
  if(bitrixSiteButtonPromise) return bitrixSiteButtonPromise;
  bitrixSiteButtonPromise = new Promise(resolve=>{
    const script = document.createElement('script');
    script.async = true;
    script.src = `${BITRIX_SITE_BUTTON_SRC}?${Date.now()/60000|0}`;
    script.onload = ()=>resolve();
    script.onerror = ()=>resolve();
    const anchor = document.getElementsByTagName('script')[0] || document.head.firstChild;
    if(anchor?.parentNode) anchor.parentNode.insertBefore(script, anchor);
    else document.head.appendChild(script);
    setTimeout(resolve, 2500);
  }).then(()=>waitForBitrixSiteButton());
  return bitrixSiteButtonPromise;
}
function waitForBitrixSiteButton(timeout=6000){
  return new Promise(resolve=>{
    const started = Date.now();
    const tick = ()=>{
      if(typeof window.BX?.LiveChat?.openLiveChat === 'function' || document.querySelector('.b24-widget-button-wrapper, .b24-widget-button-block, [data-b24-crm-button-widget], iframe[src*="bitrix"], iframe[src*="livechat"]')){
        resolve(true);
        return;
      }
      if(Date.now() - started > timeout){
        resolve(false);
        return;
      }
      setTimeout(tick, 180);
    };
    tick();
  });
}
function clickElementLikeUser(element){
  if(!element) return false;
  try{
    element.dispatchEvent(new MouseEvent('mouseover', {bubbles:true, cancelable:true, view:window}));
    element.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, cancelable:true, view:window}));
    element.dispatchEvent(new MouseEvent('mouseup', {bubbles:true, cancelable:true, view:window}));
    element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
    if(typeof element.click === 'function') element.click();
    return true;
  }catch{
    try{ element.click(); return true; }catch{}
  }
  return false;
}
function isElementVisibleForClick(element){
  if(!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none';
}
function clickBitrixLiveChatCandidate({generic=false}={}){
  const selectors = [
    '[data-b24-crm-button-widget="openline_livechat"]',
    '.b24-widget-button-openline_livechat',
    '.b24-widget-button-social-item[data-b24-crm-button-widget*="openline"]',
    '.b24-widget-button-social-item:not(.b24-widget-button-crmform)'
  ];
  if(generic){
    selectors.push('.b24-widget-button-block', '.b24-widget-button-wrapper');
  }
  for(const selector of selectors){
    const element = document.querySelector(selector);
    if(element && isElementVisibleForClick(element)){
      return clickElementLikeUser(element);
    }
  }
  return false;
}
function hasBitrixLiveChatSurface(){
  return Boolean(document.querySelector(
    'iframe[src*="livechat"], iframe[src*="online"], .bx-livechat-wrapper, .bx-mobilechat-wrapper, .bx-livechat-box, .bx-mobilechat-box, .b24-window-popup, .b24-window'
  ));
}
function waitForBitrixLiveChatSurface(timeout=2600){
  return new Promise(resolve=>{
    const started = Date.now();
    const tick = ()=>{
      if(hasBitrixLiveChatSurface()){
        resolve(true);
        return;
      }
      if(Date.now() - started > timeout){
        resolve(false);
        return;
      }
      setTimeout(tick, 160);
    };
    tick();
  });
}
function waitForBitrixLiveChatApi(timeout=8000){
  return new Promise(resolve=>{
    const started = Date.now();
    const tick = ()=>{
      const bxLiveChat = window.BX?.LiveChat || window.BX?.Livechat;
      if(typeof bxLiveChat?.openLiveChat === 'function'){
        resolve(bxLiveChat);
        return;
      }
      if(Date.now() - started > timeout){
        resolve(null);
        return;
      }
      setTimeout(tick, 180);
    };
    tick();
  });
}
async function openBitrixLiveChat(context={}){
  initBitrixLiveChatBridge();
  applyBitrixLiveChatContext(context);
  if(bitrixLiveChatWidget) applyBitrixLiveChatLocalize(bitrixLiveChatWidget);
  await loadBitrixSiteButton();
  if(bitrixLiveChatWidget) applyBitrixLiveChatLocalize(bitrixLiveChatWidget);
  if(hasBitrixLiveChatSurface()){
    polishBitrixLiveChatDom();
    return true;
  }
  const officialWidget = await waitForBitrixLiveChatWidget(3200);
  if(typeof officialWidget?.open === 'function'){
    applyBitrixLiveChatLocalize(officialWidget);
    applyBitrixLiveChatContext(context);
    try{
      officialWidget.open();
      emitBitrixLiveChatEvent('open-requested');
      if(await waitForBitrixLiveChatSurface()) return true;
      return true;
    }catch{}
  }
  const bxLiveChat = await waitForBitrixLiveChatApi();
  if(typeof bxLiveChat?.openLiveChat === 'function'){
    try{ bxLiveChat.openLiveChat(); }catch{}
    if(await waitForBitrixLiveChatSurface()) return true;
  }
  if(clickBitrixLiveChatCandidate()){
    if(await waitForBitrixLiveChatSurface()) return true;
  }
  if(clickBitrixLiveChatCandidate({generic:true})){
    await new Promise(resolve=>setTimeout(resolve, 700));
    if(hasBitrixLiveChatSurface()) return true;
    if(clickBitrixLiveChatCandidate()){
      if(await waitForBitrixLiveChatSurface(3200)) return true;
    }
  }
  return hasBitrixLiveChatSurface();
}
function getAiMessengerLinks(){
  const configured = window.PNP_MESSENGER_LINKS && typeof window.PNP_MESSENGER_LINKS === 'object'
    ? window.PNP_MESSENGER_LINKS
    : {};
  return {
    telegram: configured.telegram || 'https://t.me/timmchek',
    whatsapp: configured.whatsapp || 'https://wa.me/qr/5NL2DPC4ZBH7M1',
    max: configured.max || 'https://max.ru/u/f9LHodD0cOL_lB6emZTUBhc8yISru83yZsG8UdwmIipd3-d5jPp867MVU5g'
  };
}
function renderAiMessengerDockItem(channel, url, label, icon){
  const safeUrl = String(url || '').trim();
  const className = `ai-messenger-link ai-messenger-link-${channel}`;
  const iconMarkup = `<img class="ai-messenger-mark" src="${escapeHtml(icon)}" alt="" aria-hidden="true" loading="lazy">`;
  if(safeUrl){
    return `<a class="${className}" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" data-ai-messenger="${escapeHtml(channel)}" aria-label="${escapeHtml(label)}">${iconMarkup}</a>`;
  }
  return `<button class="${className} is-disabled" type="button" data-ai-messenger="${escapeHtml(channel)}" aria-label="${escapeHtml(label)} скоро будет подключён">${iconMarkup}</button>`;
}
function initAiChatWidget(){
  if(!shouldShowAiChat() || document.querySelector('.ai-chat-widget')) return;
  const widget = document.createElement('section');
  widget.className = 'ai-chat-widget';
  widget.setAttribute('aria-label','AI-помощник ПНП');
  const messengerLinks = getAiMessengerLinks();
  widget.innerHTML = `
    <div class="ai-chat-panel" hidden>
      <div class="ai-chat-head">
        <div>
          <strong>Помощник ПНП</strong>
          <span>Соберёт заявку и передаст менеджеру</span>
        </div>
        <button type="button" class="ai-chat-contact-edit" data-ai-contact-edit hidden>Контакт</button>
        <button type="button" class="ai-chat-size-toggle" data-ai-size-toggle aria-label="Развернуть чат" title="Развернуть чат">↗</button>
        <button type="button" class="ai-chat-close" aria-label="Закрыть">×</button>
      </div>
      <form class="ai-chat-contact-form" data-ai-contact-form>
        <strong>Заполните контакт</strong>
        <span>Так менеджер сможет подключиться к заявке без лишних шагов.</span>
        <input name="aiContactName" autocomplete="name" placeholder="ФИО / компания" required>
        <input name="aiContactPhone" autocomplete="tel" inputmode="tel" placeholder="+7 999 000-00-00" required>
        <label class="ai-chat-consent"><input type="checkbox" name="aiContactConsent" required><span>Согласен на обработку данных для заявки</span></label>
        <button class="btn small" type="submit">Начать подбор</button>
        <small data-ai-contact-error></small>
      </form>
      <div class="ai-chat-note">Напишите материал, количество, город или прикрепите спецификацию скрепкой. Точные цены и сроки подтвердит менеджер.</div>
      <div class="ai-chat-messages" aria-live="polite">
        <div class="ai-chat-message ai-chat-message-bot">Контакт сохранил. Теперь напишите, что нужно на объект: материал, количество, город или прикрепите спецификацию. Я соберу заявку для менеджера.</div>
      </div>
      <div class="ai-chat-quick" aria-label="Быстрые сценарии">
        <button type="button" data-ai-attach-file>Прикрепить файл</button>
        <button type="button" data-ai-manager>Позвать менеджера</button>
      </div>
      <form class="ai-chat-form">
        <div class="ai-chat-file-list" aria-live="polite"></div>
        <textarea name="message" rows="3" placeholder="Напишите задачу или добавьте файл"></textarea>
        <div class="ai-chat-compose-actions">
          <input class="ai-chat-file-input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png,.zip" multiple hidden>
          <button type="button" class="ai-chat-file-button" aria-label="Прикрепить файл или фото" title="Прикрепить файл или фото">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 12.8l6.4-6.4a3 3 0 114.2 4.2l-8.2 8.2a5 5 0 01-7.1-7.1l8.9-8.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="btn small ai-chat-transfer-inline" data-ai-lead-transfer hidden>В форму</button>
          <button class="btn small ai-chat-submit" type="submit" aria-label="Отправить">↑</button>
        </div>
      </form>
      <span class="ai-chat-resize-handle" data-ai-resize aria-hidden="true"></span>
    </div>
    <div class="ai-chat-dock">
      <nav class="ai-messenger-dock" aria-label="Мессенджеры ПНП">
        ${renderAiMessengerDockItem('telegram', messengerLinks.telegram, 'Открыть Telegram ПНП', 'assets/img/messengers/telegram.svg')}
        ${renderAiMessengerDockItem('whatsapp', messengerLinks.whatsapp, 'Открыть WhatsApp ПНП', 'assets/img/messengers/whatsapp.svg')}
        ${renderAiMessengerDockItem('max', messengerLinks.max, 'Открыть MAX ПНП', 'assets/img/messengers/max.svg')}
      </nav>
      <button class="ai-chat-toggle" type="button" aria-expanded="false">
        <span><small>AI-поддержка</small><strong>Помощник по комплектации</strong></span>
        <b>AI</b>
      </button>
    </div>`;
  document.body.appendChild(widget);

  const toggle = widget.querySelector('.ai-chat-toggle');
  const panel = widget.querySelector('.ai-chat-panel');
  const close = widget.querySelector('.ai-chat-close');
  const sizeToggle = widget.querySelector('[data-ai-size-toggle]');
  const resizeHandle = widget.querySelector('[data-ai-resize]');
  const contactForm = widget.querySelector('[data-ai-contact-form]');
  const contactEdit = widget.querySelector('[data-ai-contact-edit]');
  const contactNameInput = widget.querySelector('[name="aiContactName"]');
  const contactPhoneInput = widget.querySelector('[name="aiContactPhone"]');
  const contactError = widget.querySelector('[data-ai-contact-error]');
  const form = widget.querySelector('.ai-chat-form');
  const input = widget.querySelector('textarea');
  const messages = widget.querySelector('.ai-chat-messages');
  const suggestions = qsa('[data-ai-prompt]', widget);
  const leadTransfer = widget.querySelector('[data-ai-lead-transfer]');
  const fileInput = widget.querySelector('.ai-chat-file-input');
  const fileButton = widget.querySelector('.ai-chat-file-button');
  const fileList = widget.querySelector('.ai-chat-file-list');
  const submitButton = widget.querySelector('.ai-chat-submit');
  const transferButton = widget.querySelector('.ai-chat-transfer-inline');
  let latestLeadDraft = readLeadDraft();
  let attachedFiles = normalizeDraftFiles(latestLeadDraft?.files);
  let pendingFiles = [];
  let leadSubmitting = false;
  let aiLeadSyncing = false;
  let aiLeadSyncPromise = null;
  const normalizeAiContact = value=>{
    const data = value && typeof value === 'object' ? value : {};
    const name = String(data.name || data.company || '').replace(/\s+/g,' ').trim().slice(0,180);
    const rawPhone = String(data.phone || '').replace(/\s+/g,' ').trim().slice(0,80);
    const phone = extractLeadPhoneFromText(rawPhone) || rawPhone;
    const email = String(data.email || '').replace(/\s+/g,' ').trim().slice(0,120);
    return {name, phone, email};
  };
  const readAiContact = ()=>{
    try{return normalizeAiContact(JSON.parse(sessionStorage.getItem(AI_CONTACT_KEY) || 'null'))}catch{return {name:'',phone:'',email:''}}
  };
  const saveAiContact = contact=>{
    const data = normalizeAiContact(contact);
    if(!data.name && !data.phone && !data.email){
      try{sessionStorage.removeItem(AI_CONTACT_KEY)}catch{}
      return data;
    }
    try{sessionStorage.setItem(AI_CONTACT_KEY, JSON.stringify(data))}catch{}
    return data;
  };
  let aiContact = readAiContact();
  if((!aiContact.name || !aiContact.phone) && (latestLeadDraft?.name || latestLeadDraft?.phone)){
    aiContact = saveAiContact({
      name:aiContact.name || latestLeadDraft.name,
      phone:aiContact.phone || latestLeadDraft.phone,
      email:aiContact.email || latestLeadDraft.email
    });
  }
  const contactIsReady = ()=>Boolean(aiContact.name && aiContact.phone);
  const mergeContactIntoDraft = draft=>{
    const base = normalizeLeadDraft(draft) || {};
    const data = normalizeAiContact(aiContact);
    return normalizeLeadDraft({
      ...base,
      name:base.name || data.name,
      phone:base.phone || data.phone,
      email:base.email || data.email,
      channel:base.channel || 'AI-чат сайта'
    });
  };
  const setContactError = message=>{
    if(contactError) contactError.textContent = message || '';
  };
  const syncContactUi = ()=>{
    const ready = contactIsReady();
    widget.classList.toggle('has-ai-contact', ready);
    if(contactEdit) contactEdit.hidden = !ready;
    if(contactNameInput && !contactNameInput.value) contactNameInput.value = aiContact.name || '';
    if(contactPhoneInput && !contactPhoneInput.value) contactPhoneInput.value = aiContact.phone || '';
  };
  if(contactIsReady()){
    latestLeadDraft = mergeContactIntoDraft(latestLeadDraft);
    if(latestLeadDraft) saveLeadDraft(latestLeadDraft);
  }
  syncContactUi();
  const clampChatSize = (width, height)=>{
    const minWidth = Math.min(330, window.innerWidth - 18);
    const maxWidth = Math.max(minWidth, Math.min(760, window.innerWidth - 18));
    const minHeight = 430;
    const maxHeight = Math.max(minHeight, window.innerHeight - 76);
    return {
      width:Math.round(Math.min(Math.max(Number(width) || 360, minWidth), maxWidth)),
      height:Math.round(Math.min(Math.max(Number(height) || 690, minHeight), maxHeight))
    };
  };
  const applyChatSize = size=>{
    if(!size) return;
    const next = clampChatSize(size.width, size.height);
    panel.style.setProperty('width', `${next.width}px`, 'important');
    panel.style.setProperty('height', `${next.height}px`, 'important');
    panel.style.setProperty('max-height', `${next.height}px`, 'important');
    widget.style.setProperty('width', `${Math.min(Math.max(next.width + 122, next.width), window.innerWidth - 18)}px`, 'important');
    try{ localStorage.setItem(AI_CHAT_SIZE_KEY, JSON.stringify(next)); }catch{}
  };
  const readChatSize = ()=>{
    try{return JSON.parse(localStorage.getItem(AI_CHAT_SIZE_KEY) || 'null')}catch{return null}
  };
  applyChatSize(readChatSize());
  sizeToggle?.addEventListener('click',()=>{
    const expanded = !widget.classList.contains('is-expanded');
    widget.classList.toggle('is-expanded', expanded);
    applyChatSize(expanded
      ? {width:Math.min(520, window.innerWidth - 18), height:Math.min(780, window.innerHeight - 76)}
      : {width:360, height:690});
    sizeToggle.textContent = expanded ? '↙' : '↗';
    sizeToggle.setAttribute('aria-label', expanded ? 'Свернуть чат' : 'Развернуть чат');
  });
  resizeHandle?.addEventListener('pointerdown',event=>{
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = panel.getBoundingClientRect();
    widget.classList.add('is-resizing');
    resizeHandle.setPointerCapture?.(event.pointerId);
    const move = moveEvent=>{
      const nextWidth = startRect.width - (moveEvent.clientX - startX);
      const nextHeight = startRect.height - (moveEvent.clientY - startY);
      applyChatSize({width:nextWidth, height:nextHeight});
    };
    const up = ()=>{
      widget.classList.remove('is-resizing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  window.addEventListener('resize',()=>applyChatSize(readChatSize()));
  const nextPendingFileId = ()=>`pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const isImageFile = file=>/^image\/(jpeg|png)$/i.test(String(file?.type || '')) || /\.(jpe?g|png)$/i.test(String(file?.name || ''));
  const fileExtensionLabel = name=>{
    const ext = String(name || '').split('.').pop().toUpperCase();
    return ext && ext !== String(name || '').toUpperCase() ? ext.slice(0,4) : 'FILE';
  };
  const validateAiFile = file=>{
    const ext = String(file?.name || '').split('.').pop().toLowerCase();
    if(!AI_ALLOWED_FILE_EXTENSIONS.includes(ext)) return 'Можно прикрепить PDF, DOC, DOCX, XLS, XLSX, DWG, JPG, PNG или ZIP.';
    if(file.size > AI_UPLOAD_MAX_BYTES) return 'Файл больше 30 МБ. Уменьшите файл или отправьте архив до 30 МБ.';
    return '';
  };
  const pendingUploadsActive = ()=>pendingFiles.some(file=>file.status === 'загружается');
  const pendingUploadsFailed = ()=>pendingFiles.some(file=>file.status === 'ошибка');
  const updateComposeState = ()=>{
    const loading = pendingUploadsActive();
    if(submitButton){
      submitButton.disabled = loading;
      submitButton.setAttribute('aria-busy', loading ? 'true' : 'false');
    }
    if(transferButton) transferButton.disabled = loading;
  };
  const createFileChip = (file, {removable=false, pendingId='', fileId='', compact=false}={})=>{
    const row = document.createElement('div');
    row.className = `ai-chat-file-row${compact ? ' ai-chat-file-row-compact' : ''}`;
    if(file.status === 'загружается') row.classList.add('is-loading');
    if(file.status === 'ошибка') row.classList.add('is-error');
    const thumb = document.createElement('span');
    thumb.className = 'ai-chat-file-thumb';
    thumb.textContent = fileExtensionLabel(file.name);
    const meta = document.createElement('span');
    meta.className = 'ai-chat-file-meta';
    const title = document.createElement('b');
    title.textContent = file.name || 'Файл';
    const status = document.createElement('small');
    const statusText = file.status || (file.extractedText ? 'распознано' : 'готов');
    status.textContent = `${statusText} · ${formatFileSize(file.size)}`;
    meta.append(title, status);
    row.append(thumb, meta);
    if(removable){
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      if(pendingId) remove.dataset.pendingId = pendingId;
      if(fileId) remove.dataset.fileId = fileId;
      remove.className = 'ai-chat-file-remove';
      row.appendChild(remove);
    }
    return row;
  };
  const appendFileChips = (parent, files, options={})=>{
    const list = normalizeDraftFiles(files);
    if(!list.length) return;
    const wrap = document.createElement('div');
    wrap.className = options.className || 'ai-chat-message-files';
    list.forEach(file=>wrap.appendChild(createFileChip({...file, status:file.extractedText ? 'распознано' : 'готов'}, {compact:true})));
    parent.appendChild(wrap);
  };
  function renderAttachedFiles(){
    if(!fileList) return;
    fileList.textContent = '';
    pendingFiles.forEach(file=>{
      fileList.appendChild(createFileChip(file, {removable:true, pendingId:file.clientId}));
    });
    updateComposeState();
  }
  function mergeLeadDraftFiles(baseDraft, files){
    const normalizedFiles = normalizeDraftFiles(files);
    const draft = normalizeLeadDraft(baseDraft) || {
      category:'Комплексная заявка',
      object:'',
      message:'Файл из AI-чата для разбора менеджером.',
      summary:'Файл прикреплён к черновику заявки.',
      files:[]
    };
    const unique = new Map();
    normalizeDraftFiles(draft.files).concat(normalizedFiles).forEach(file=>unique.set(file.id, file));
    return normalizeLeadDraft({
      ...draft,
      files:[...unique.values()].slice(0,AI_UPLOAD_MAX_FILES),
      summary:draft.summary || `Прикреплено файлов: ${unique.size}`
    });
  }
  function mergeLeadDraftWithChatContext(incomingDraft, chatText, files){
    const previous = normalizeLeadDraft(latestLeadDraft);
    const incoming = normalizeLeadDraft(incomingDraft);
    const contact = extractLeadContactsFromText(chatText);
    const storedContact = normalizeAiContact(aiContact);
    const hasExtractedFileText = Boolean(buildFilesExtractedText(files));
    const chatContextMessage = buildChatContextMessage(chatText, files);
    const fallbackMessage = !isGenericAiFileMessage(previous?.message)
      ? previous.message
      : chatContextMessage;
    const incomingMessage = incoming?.message || incoming?.summary || '';
    const preferChatContext = isWeakLeadManagerMessage(incomingMessage, chatText);
    const nextMessage = hasExtractedFileText
      ? fallbackMessage
      : preferChatContext
      ? chatContextMessage
      : !isGenericAiFileMessage(incomingMessage)
      ? incomingMessage
      : fallbackMessage;
    return mergeLeadDraftFiles({
      name:incoming?.name || contact.name || previous?.name || storedContact.name || '',
      phone:incoming?.phone || contact.phone || previous?.phone || storedContact.phone || '',
      email:incoming?.email || contact.email || previous?.email || storedContact.email || '',
      category:incoming?.category || previous?.category || 'Комплексная заявка',
      object:incoming?.object || previous?.object || '',
      message:nextMessage,
      summary:leadSummaryFromMessage(nextMessage || incoming?.summary || previous?.summary),
      files:normalizeDraftFiles(previous?.files).concat(normalizeDraftFiles(incoming?.files)),
      channel:'AI-чат сайта'
    }, files);
  }
  const syncDraftToFormIfPresent = draft=>{
    const data = normalizeLeadDraft(draft);
    if(!data || !qs('#leadForm')) return;
    window.dispatchEvent(new CustomEvent('pnp:apply-ai-lead-draft', {detail:data}));
  };
  const removeLeadConfirmationCard = ()=>{
    widget.querySelector('[data-ai-lead-card]')?.remove();
  };
  const leadFieldValue = value=>{
    const clean = String(value || '').trim();
    return clean || 'не указано';
  };
  const leadMessagePreview = message=>{
    const clean = String(message || '').replace(/\n{3,}/g,'\n\n').trim();
    return clean ? clean.slice(0,720) : 'Суть заявки пока не собрана';
  };
  const renderLeadConfirmationCard = ()=>{
    removeLeadConfirmationCard();
    const data = normalizeLeadDraft(latestLeadDraft);
    if(!data || (!leadDraftHasRequest(data) && !data.files.length)) return;
    const missing = getLeadDraftMissingFields(data);
    const canSubmit = !missing.length && !leadSubmitting;
    const card = document.createElement('article');
    card.className = 'ai-chat-lead-card';
    card.dataset.aiLeadCard = '1';
    card.innerHTML = `
      <div class="ai-chat-lead-card-head">
        <strong>Заявка для менеджера</strong>
        <span>${missing.length ? `Нужно добавить: ${missing.join(', ')}` : 'Проверьте данные перед отправкой'}</span>
      </div>
      <dl>
        <div><dt>Имя / компания</dt><dd>${escapeHtml(leadFieldValue(data.name))}</dd></div>
        <div><dt>Телефон</dt><dd>${escapeHtml(leadFieldValue(data.phone))}</dd></div>
        <div><dt>Направление</dt><dd>${escapeHtml(leadFieldValue(data.category || 'Комплексная заявка'))}</dd></div>
        <div><dt>Объект / город</dt><dd>${escapeHtml(leadFieldValue(data.object))}</dd></div>
        <div class="ai-chat-lead-card-wide"><dt>Суть заявки</dt><dd>${escapeHtml(leadMessagePreview(data.message || data.summary))}</dd></div>
        <div class="ai-chat-lead-card-wide"><dt>Файлы</dt><dd data-ai-lead-files>${data.files.length ? '' : 'нет'}</dd></div>
      </dl>
      <div class="ai-chat-lead-card-actions">
        <button type="button" class="btn small ai-chat-lead-submit-btn" data-ai-lead-submit ${canSubmit ? '' : 'disabled'}>${leadSubmitting ? 'Отправляем...' : 'Отправить заявку'}</button>
        <button type="button" class="btn small ai-chat-lead-secondary" data-ai-lead-add-file>Добавить файл</button>
        <button type="button" class="btn small ai-chat-lead-secondary" data-ai-lead-edit>Изменить</button>
      </div>
      <div class="ai-chat-lead-editor" data-ai-lead-editor hidden>
        <label>Суть заявки для менеджера</label>
        <textarea data-ai-lead-editor-text rows="6">${escapeHtml(data.message || data.summary || '')}</textarea>
        <div>
          <button type="button" class="btn small" data-ai-lead-save-edit>Сохранить</button>
          <button type="button" class="btn small ai-chat-lead-secondary" data-ai-lead-cancel-edit>Отмена</button>
        </div>
      </div>
    `;
    const leadFiles = card.querySelector('[data-ai-lead-files]');
    if(leadFiles && data.files.length){
      leadFiles.textContent = '';
      appendFileChips(leadFiles, data.files, {className:'ai-chat-lead-files'});
    }
    messages.appendChild(card);
    messages.scrollTop = messages.scrollHeight;
  };
  const updateLeadDraftCard = draft=>{
    latestLeadDraft = saveLeadDraft(mergeContactIntoDraft(draft) || draft) || latestLeadDraft;
    attachedFiles = normalizeDraftFiles(latestLeadDraft?.files);
    renderAttachedFiles();
    syncDraftToFormIfPresent(latestLeadDraft);
    if(leadTransfer) leadTransfer.hidden = !latestLeadDraft;
    renderLeadConfirmationCard();
  };
  if(latestLeadDraft) updateLeadDraftCard(latestLeadDraft);
  const HISTORY_KEY = 'pnpAiChatHistoryV2';
  const MAX_HISTORY = 12;
  const readHistory = ()=>{
    try{
      const parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
      if(!Array.isArray(parsed)) return [];
      return parsed
        .filter(item=>item && (item.role === 'user' || item.role === 'assistant') && item.content)
        .map(item=>({role:item.role, content:String(item.content).slice(0,1200)}))
        .slice(-MAX_HISTORY);
    }catch{
      return [];
    }
  };
  let conversation = readHistory();
  const saveHistory = ()=>{
    try{ sessionStorage.setItem(HISTORY_KEY, JSON.stringify(conversation.slice(-MAX_HISTORY))); }catch{}
  };
  const remember = (role, content)=>{
    const clean = String(content || '').replace(/\s+/g,' ').trim().slice(0,1200);
    if(!clean) return;
    conversation = conversation.concat({role, content:clean}).slice(-MAX_HISTORY);
    saveHistory();
  };
  const appendSafeLink = (parent, label, href)=>{
    const safeHref = String(href || '').trim();
    if(!/^(https?:\/\/|\/|contacts\.html|\.\/contacts\.html)/.test(safeHref)){
      parent.appendChild(document.createTextNode(label));
      return;
    }
    const link = document.createElement('a');
    link.href = safeHref;
    link.textContent = label;
    if(/^https?:\/\//.test(safeHref)){
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    parent.appendChild(link);
  };
  const renderAiText = (parent, text)=>{
    const source = String(text || '');
    const markdownLink = /\[([^\]]{1,80})\]\((https?:\/\/[^)\s]+|\/[^)\s]+|contacts\.html#[^)\s]+|\.\/contacts\.html#[^)\s]+)\)/g;
    let lastIndex = 0;
    let match;
    while((match = markdownLink.exec(source))){
      parent.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
      appendSafeLink(parent, match[1], match[2]);
      lastIndex = match.index + match[0].length;
    }
    const rest = source.slice(lastIndex);
    const urlLink = /(https?:\/\/[^\s]+|\/contacts#request-form|\/contacts\.html#request-form|contacts\.html#request-form)/g;
    let restIndex = 0;
    let urlMatch;
    while((urlMatch = urlLink.exec(rest))){
      parent.appendChild(document.createTextNode(rest.slice(restIndex, urlMatch.index)));
      appendSafeLink(parent, urlMatch[0], urlMatch[0]);
      restIndex = urlMatch.index + urlMatch[0].length;
    }
    parent.appendChild(document.createTextNode(rest.slice(restIndex)));
  };
  const setOpen = open=>{
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    widget.classList.toggle('is-open', open);
    if(open) setTimeout(()=>contactIsReady() ? input.focus() : contactNameInput?.focus(), 80);
  };
  const addMessage = (text, type='bot', persist=true, files=[])=>{
    const item = document.createElement('div');
    item.className = `ai-chat-message ai-chat-message-${type}`;
    if(type === 'bot') renderAiText(item, text);
    else item.textContent = text;
    appendFileChips(item, files);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    if(persist){
      const fileNote = normalizeDraftFiles(files).map(file=>`Файл: ${file.name} ${file.url}`).join(' ');
      remember(type === 'user' ? 'user' : 'assistant', [text, fileNote].filter(Boolean).join(' '));
    }
    return item;
  };
  const setBotMessage = (item, text)=>{
    item.textContent = '';
    renderAiText(item, text);
    messages.scrollTop = messages.scrollHeight;
  };
  const buildLeadChatHistory = ()=>conversation
    .filter(item=>item && (item.role === 'user' || item.role === 'assistant') && item.content)
    .map(item=>({
      role:item.role,
      content:String(item.content || '').replace(/\s+/g,' ').trim().slice(0,1200)
    }))
    .filter(item=>item.content)
    .slice(-MAX_HISTORY);
  const buildChatLeadPayload = ()=>{
    const contact = normalizeAiContact(aiContact);
    const data = normalizeLeadDraft(latestLeadDraft) || normalizeLeadDraft({
      name:contact.name,
      phone:contact.phone,
      email:contact.email,
      category:'Комплексная заявка',
      message:'Первичный контакт AI-чата. Клиент начал подбор, заявка уточняется.',
      channel:'AI-чат сайта'
    });
    if(!data) return null;
    const cleanMessage = (data.message || data.summary || '').trim();
    const chatHistory = buildLeadChatHistory();
    const missingFields = getLeadDraftMissingFields(data);
    const bitrixLead = readAiBitrixLead();
    return {
      name:data.name,
      phone:data.phone,
      email:data.email,
      category:data.category || 'Комплексная заявка',
      object:data.object || '',
      message:cleanMessage,
      files:normalizeDraftFiles(data.files),
      leadDraft:{...data, channel:'AI-чат сайта', chatHistory},
      chatHistory,
      missingFields,
      page:location.href,
      channel:'AI-чат сайта',
      source_channel:'ai_chat',
      bitrixLeadId:bitrixLead?.bitrixId || '',
      bitrix_id:bitrixLead?.bitrixId || ''
    };
  };
  async function syncAiLeadWithBitrix({silent=false, reason='ai_chat'}={}){
    if(!contactIsReady()) return readAiBitrixLead();
    if(aiLeadSyncPromise){
      await aiLeadSyncPromise.catch(()=>{});
    }
    const payload = buildChatLeadPayload();
    if(!payload) return null;
    aiLeadSyncing = true;
    aiLeadSyncPromise = (async()=>{
      const response = await fetch(getAiApiEndpoint('/api/lead-submit'), {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          ...payload,
          message:payload.message || 'Первичный контакт AI-чата. Клиент начал подбор, заявка уточняется.',
          leadReason:reason,
          silent
        })
      });
      const result = await response.json().catch(()=>({}));
      if(response.ok && result.queued && result.bitrix_id){
        return saveAiBitrixLead({ bitrixId:result.bitrix_id, leadId:result.lead_id });
      }
      return readAiBitrixLead();
    })();
    try{
      return await aiLeadSyncPromise;
    }catch{}
    finally{
      aiLeadSyncing = false;
      aiLeadSyncPromise = null;
    }
    return readAiBitrixLead();
  }
  const clearChatLeadDraft = ()=>{
    try{ sessionStorage.removeItem(AI_LEAD_DRAFT_KEY); }catch{}
    try{ sessionStorage.removeItem(AI_BITRIX_LEAD_KEY); }catch{}
    latestLeadDraft = null;
    attachedFiles = [];
    pendingFiles.forEach(file=>{ if(file.previewUrl) URL.revokeObjectURL(file.previewUrl); });
    pendingFiles = [];
    renderAttachedFiles();
    removeLeadConfirmationCard();
    if(leadTransfer) leadTransfer.hidden = true;
  };
  async function submitLeadFromChat(){
    if(!contactIsReady()){
      widget.classList.remove('has-ai-contact');
      setContactError('Сначала укажите ФИО / компанию и телефон.');
      contactNameInput?.focus();
      return;
    }
    const data = normalizeLeadDraft(latestLeadDraft);
    const missing = getLeadDraftMissingFields(data);
    if(missing.length){
      addMessage(`Чтобы отправить заявку менеджеру, добавьте: ${missing.join(', ')}.`, 'bot');
      renderLeadConfirmationCard();
      input.focus();
      return;
    }
    const payload = buildChatLeadPayload();
    if(!payload) return;
    leadSubmitting = true;
    renderLeadConfirmationCard();
    if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_lead_submit_attempt', { category:payload.category || '' });
    try{
      const response = await fetch(getAiApiEndpoint('/api/lead-submit'), {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload)
      });
      const result = await response.json().catch(()=>({}));
      if(!response.ok || !result.queued) throw new Error(result.error || result.bitrix_error || 'lead_submit_failed');
      if(result.bitrix_id) saveAiBitrixLead({ bitrixId:result.bitrix_id, leadId:result.lead_id });
      if(result.bitrix_configured && !result.bitrix_sent){
        addMessage(`Заявку сохранил на сервере, но CRM пока не подтвердила приём. Продублируйте звонком ${SITE.phone}, чтобы не потерять срочный запрос.`, 'bot');
        if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_lead_bitrix_pending', { category:payload.category || '' });
        return;
      }
      latestLeadDraft = saveLeadDraft(mergeContactIntoDraft(latestLeadDraft)) || latestLeadDraft;
      renderLeadConfirmationCard();
      addMessage('Заявка отправлена, менеджер свяжется с вами.', 'bot');
      if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_lead_submit_success', { category:payload.category || '' });
    }catch{
      addMessage(`Не получилось отправить заявку автоматически. Оставьте контакты через форму или позвоните ${SITE.phone}.`, 'bot');
      if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_lead_submit_error', { category:payload.category || '' });
    }finally{
      leadSubmitting = false;
      renderLeadConfirmationCard();
    }
  }
  messages.addEventListener('click', event=>{
    if(event.target.closest?.('[data-ai-lead-submit]')){
      submitLeadFromChat();
      return;
    }
    if(event.target.closest?.('[data-ai-lead-add-file]')){
      fileInput?.click();
      return;
    }
    if(event.target.closest?.('[data-ai-lead-edit]')){
      const card = event.target.closest('[data-ai-lead-card]');
      const editor = card?.querySelector('[data-ai-lead-editor]');
      const editorText = card?.querySelector('[data-ai-lead-editor-text]');
      if(editor && editorText){
        editor.hidden = false;
        editorText.value = normalizeLeadDraft(latestLeadDraft)?.message || '';
        editorText.focus();
      }else{
        input.focus();
        input.placeholder = 'Напишите, что изменить в заявке';
      }
      return;
    }
    if(event.target.closest?.('[data-ai-lead-save-edit]')){
      const card = event.target.closest('[data-ai-lead-card]');
      const editorText = card?.querySelector('[data-ai-lead-editor-text]');
      const text = String(editorText?.value || '').trim();
      if(text){
        latestLeadDraft = saveLeadDraft({
          ...(normalizeLeadDraft(latestLeadDraft) || {}),
          message:text,
          summary:leadSummaryFromMessage(text)
        }) || latestLeadDraft;
        syncDraftToFormIfPresent(latestLeadDraft);
        renderLeadConfirmationCard();
        syncAiLeadWithBitrix({silent:true, reason:'manual_lead_edit'}).catch(()=>{});
      }
      return;
    }
    if(event.target.closest?.('[data-ai-lead-cancel-edit]')){
      const card = event.target.closest('[data-ai-lead-card]');
      const editor = card?.querySelector('[data-ai-lead-editor]');
      if(editor) editor.hidden = true;
      return;
    }
  });
  const uploadPendingFile = async pending=>{
    if(pending.uploadedFile) return pending.uploadedFile;
    if(pending.uploadPromise) return pending.uploadPromise;
    const file = pending.file;
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    pending.status = 'загружается';
    renderAttachedFiles();
    const data = new FormData();
    data.append('file', file, file.name);
    pending.uploadPromise = (async()=>{
      const response = await fetch(getAiApiEndpoint('/api/ai-upload'), {method:'POST', body:data});
      const payload = await response.json().catch(()=>({}));
      if(!response.ok || !payload.file) throw new Error(payload.error || 'upload_failed');
      pending.uploadedFile = payload.file;
      pending.status = 'готов';
      attachedFiles = normalizeDraftFiles(attachedFiles.concat([payload.file]));
      latestLeadDraft = mergeLeadDraftFiles(latestLeadDraft, attachedFiles);
      if(latestLeadDraft) saveLeadDraft(latestLeadDraft);
      syncDraftToFormIfPresent(latestLeadDraft);
      renderLeadConfirmationCard();
      renderAttachedFiles();
      if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_file_uploaded', { ext, size:file.size });
      return payload.file;
    })();
    try{
      return await pending.uploadPromise;
    }catch{
      pending.status = 'ошибка';
      pending.uploadPromise = null;
      renderAttachedFiles();
      if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_file_upload_error', { ext, size:file.size });
      throw new Error('file_upload_failed');
    }
  };
  const flushPendingFilesToDraft = async (contextText='Файлы из AI-чата для разбора менеджером.')=>{
    if(!pendingFiles.length) return [];
    const uploadedNow = await Promise.all(pendingFiles.map(file=>uploadPendingFile(file)));
    pendingFiles.forEach(file=>{ if(file.previewUrl) URL.revokeObjectURL(file.previewUrl); });
    pendingFiles = [];
    attachedFiles = normalizeDraftFiles(attachedFiles.concat(uploadedNow));
    latestLeadDraft = mergeLeadDraftFiles({
      ...latestLeadDraft,
      category:latestLeadDraft?.category || 'Комплексная заявка',
      message:isGenericAiFileMessage(latestLeadDraft?.message)
        ? buildChatContextMessage(contextText, attachedFiles)
        : latestLeadDraft?.message,
      summary:latestLeadDraft?.summary || `Прикреплено файлов: ${uploadedNow.length}`
    }, attachedFiles);
    updateLeadDraftCard(latestLeadDraft);
    return uploadedNow;
  };
  fileButton?.addEventListener('click',()=>fileInput?.click());
  fileInput?.addEventListener('change',()=>{
    const selected = Array.from(fileInput.files || []);
    const freeSlots = AI_UPLOAD_MAX_FILES - attachedFiles.length - pendingFiles.length;
    if(freeSlots <= 0){
      addMessage(`К одному черновику можно прикрепить до ${AI_UPLOAD_MAX_FILES} файлов.`, 'bot');
      if(fileInput) fileInput.value = '';
      return;
    }
    selected.slice(0, freeSlots).forEach(file=>{
      const error = validateAiFile(file);
      if(error){
        addMessage(error, 'bot');
        return;
      }
      pendingFiles.push({
        clientId:nextPendingFileId(),
        file,
        name:file.name,
        size:file.size,
        status:'загружается',
        previewUrl:''
      });
      const pending = pendingFiles[pendingFiles.length - 1];
      uploadPendingFile(pending).catch(()=>{});
    });
    if(selected.length > freeSlots) addMessage(`Добавил первые ${freeSlots} файла. В черновике можно держать до ${AI_UPLOAD_MAX_FILES}.`, 'bot');
    renderAttachedFiles();
    if(fileInput) fileInput.value = '';
  });
  fileList?.addEventListener('click',event=>{
    const button = event.target.closest?.('.ai-chat-file-remove');
    if(!button) return;
    if(button.dataset.pendingId){
      const removed = pendingFiles.find(file=>file.clientId === button.dataset.pendingId);
      if(removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      if(removed?.uploadedFile?.id){
        attachedFiles = attachedFiles.filter(file=>file.id !== removed.uploadedFile.id);
        latestLeadDraft = normalizeLeadDraft({...latestLeadDraft, files:attachedFiles});
        if(latestLeadDraft) saveLeadDraft(latestLeadDraft);
        syncDraftToFormIfPresent(latestLeadDraft);
        renderLeadConfirmationCard();
      }
      pendingFiles = pendingFiles.filter(file=>file.clientId !== button.dataset.pendingId);
      renderAttachedFiles();
      return;
    }
    attachedFiles = attachedFiles.filter(file=>file.id !== button.dataset.fileId);
    latestLeadDraft = normalizeLeadDraft({...latestLeadDraft, files:attachedFiles});
    if(latestLeadDraft) saveLeadDraft(latestLeadDraft);
    else try{sessionStorage.removeItem(AI_LEAD_DRAFT_KEY)}catch{}
    syncDraftToFormIfPresent(latestLeadDraft);
    renderAttachedFiles();
    addMessage('Файл убрал из черновика заявки.', 'bot');
  });
  if(conversation.length){
    messages.textContent = '';
    conversation.forEach(item=>addMessage(item.content, item.role === 'user' ? 'user' : 'bot', false));
    if(latestLeadDraft) renderLeadConfirmationCard();
  }
  toggle.addEventListener('click',()=>{
    const open = panel.hidden;
    setOpen(open);
    if(open && typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_open', { page:location.pathname });
  });
  close.addEventListener('click',()=>setOpen(false));
  leadTransfer?.addEventListener('click',()=>goToLeadFormWithDraft(latestLeadDraft));
  qsa('[data-ai-messenger]', widget).forEach(link=>link.addEventListener('click',event=>{
    const channel = link.dataset.aiMessenger || '';
    if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_messenger_click', { channel, active:!link.classList.contains('is-disabled') });
    if(link.classList.contains('is-disabled')){
      event.preventDefault();
      setOpen(true);
      const labels = {telegram:'Telegram', whatsapp:'WhatsApp', max:'MAX'};
      addMessage(`${labels[channel] || 'Канал'} подготовлен в интерфейсе. Подключим его, когда будет готов аккаунт, бот и CRM-сценарий.`, 'bot');
    }
  }));
  contactEdit?.addEventListener('click',()=>{
    widget.classList.remove('has-ai-contact');
    if(contactNameInput) contactNameInput.value = aiContact.name || '';
    if(contactPhoneInput) contactPhoneInput.value = aiContact.phone || '';
    setContactError('');
    contactNameInput?.focus();
  });
  contactForm?.addEventListener('submit',event=>{
    event.preventDefault();
    const contact = normalizeAiContact({
      name:contactNameInput?.value,
      phone:contactPhoneInput?.value
    });
    if(!contact.name || !contact.phone){
      setContactError('Нужны ФИО / компания и телефон, чтобы менеджер мог принять заявку.');
      (!contact.name ? contactNameInput : contactPhoneInput)?.focus();
      return;
    }
    const consent = qs('[name="aiContactConsent"]', contactForm);
    if(consent && !consent.checked){
      setContactError('Подтвердите согласие на обработку данных, чтобы начать подбор.');
      consent.focus();
      return;
    }
    aiContact = saveAiContact(contact);
    latestLeadDraft = mergeContactIntoDraft(latestLeadDraft);
    if(latestLeadDraft) saveLeadDraft(latestLeadDraft);
    syncContactUi();
    setContactError('');
    input.focus();
    if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_contact_saved', { page:location.pathname });
    syncAiLeadWithBitrix({silent:true, reason:'contact_saved'}).catch(()=>{});
  });
  suggestions.forEach(button=>button.addEventListener('click',()=>{
    input.value = button.dataset.aiPrompt || '';
    input.focus();
  }));
  qsa('[data-ai-attach-file]', widget).forEach(button=>button.addEventListener('click',()=>fileInput?.click()));
  const bitrixLiveChatEnabled = ()=>{
    const params = new URLSearchParams(location.search);
    if(params.get('bitrixLiveChat') === '0' || window.PNP_ENABLE_BITRIX_LIVECHAT === false) return false;
    return true;
  };
  qsa('[data-ai-manager]', widget).forEach(button=>button.addEventListener('click',async()=>{
    if(!contactIsReady()){
      widget.classList.remove('has-ai-contact');
      setContactError('Сначала укажите ФИО / компанию и телефон, чтобы менеджер видел контакт в CRM.');
      contactNameInput?.focus();
      return;
    }
    button.disabled = true;
    addMessage(BITRIX_LIVECHAT_HANDOFF_TEXT, 'bot');
    if(pendingFiles.length){
      if(pendingUploadsActive()){
        addMessage('Дождёмся загрузки файла, чтобы менеджер получил его вместе с заявкой.', 'bot');
      }
      try{
        await flushPendingFilesToDraft('Клиент позвал менеджера и приложил файл для разбора.');
      }catch{
        addMessage('Файл не загрузился. Менеджера всё равно подключаю, файл можно будет отправить в чат Bitrix.', 'bot');
      }
    }
    if(latestLeadDraft) latestLeadDraft = saveLeadDraft(mergeContactIntoDraft(latestLeadDraft)) || latestLeadDraft;
    const bitrixLead = await syncAiLeadWithBitrix({silent:false, reason:'manager_call'});
    const liveChatContext = {
      ...buildChatLeadPayload(),
      bitrixLeadId:bitrixLead?.bitrixId || readAiBitrixLead()?.bitrixId || ''
    };
    let opened = false;
    if(bitrixLiveChatEnabled()){
      try{ opened = await openBitrixLiveChat(liveChatContext); }catch{ opened = false; }
    }
    if(opened){
      setTimeout(()=>setOpen(false), 650);
    }
    if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_manager_call', { opened, mode:bitrixLiveChatEnabled() ? 'bitrix_livechat' : 'safe_handoff' });
    button.disabled = false;
  }));
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!contactIsReady()){
      widget.classList.remove('has-ai-contact');
      setContactError('Сначала укажите ФИО / компанию и телефон.');
      contactNameInput?.focus();
      return;
    }
    const text = input.value.trim();
    if(!text && !pendingFiles.length) return;
    if(pendingUploadsActive()){
      addMessage('Файл ещё загружается. Отправка станет доступна сразу после загрузки.', 'bot');
      return;
    }
    if(pendingUploadsFailed()){
      addMessage('Один из файлов не загрузился. Удалите его или попробуйте прикрепить заново.', 'bot');
      return;
    }
    const requestHistory = conversation.slice(-10);
    input.value = '';
    let uploadedNow = [];
    const userText = text || 'Прошу разобрать прикреплённый файл и подготовить КП.';
    if(submitButton) submitButton.disabled = true;
    if(transferButton) transferButton.disabled = true;
    if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_submit', { page:location.pathname });
    try{
      if(pendingFiles.length){
        uploadedNow = await Promise.all(pendingFiles.map(file=>uploadPendingFile(file)));
        pendingFiles.forEach(file=>{ if(file.previewUrl) URL.revokeObjectURL(file.previewUrl); });
        pendingFiles = [];
        renderAttachedFiles();
        attachedFiles = normalizeDraftFiles(attachedFiles.concat(uploadedNow));
        latestLeadDraft = mergeLeadDraftFiles({
          ...latestLeadDraft,
          category:latestLeadDraft?.category || 'Комплексная заявка',
          message:isGenericAiFileMessage(latestLeadDraft?.message)
            ? buildChatContextMessage(userText, attachedFiles)
            : latestLeadDraft.message,
          summary:latestLeadDraft?.summary || `Прикреплено файлов: ${uploadedNow.length}`
        }, attachedFiles);
        updateLeadDraftCard(latestLeadDraft);
      }
      addMessage(userText, 'user', true, uploadedNow);
      const wait = addMessage(uploadedNow.length ? 'Файл прикрепил к заявке. Собираю черновик для менеджера...' : 'Смотрю задачу...', 'bot', false);
      const extractedPrompt = buildFilesExtractedText(uploadedNow);
      const filePrompt = uploadedNow.length
        ? `\n\nК сообщению прикреплены файлы: ${uploadedNow.map(file=>`${file.name} (${file.url})`).join('; ')}.${extractedPrompt ? `\n\nРаспознанный текст из прикреплённых файлов:\n${extractedPrompt}\n\nИспользуй распознанный текст как спецификацию клиента.` : ' Содержимое файлов не распознано автоматически; зафиксируй, что менеджер должен разобрать вложение.'}`
        : '';
      const response = await fetch(getAiChatEndpoint(), {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          message:`${userText}${filePrompt}`,
          page:location.pathname,
          history:requestHistory,
          contact:aiContact,
          leadDraft:latestLeadDraft
        })
      });
      const payload = await response.json().catch(()=>({}));
      const answer = payload.answer || 'AI-ответ сейчас недоступен. Перенесите черновик в форму и оставьте контакты, менеджер подключится к подбору.';
      setBotMessage(wait, answer);
      remember('assistant', answer);
      if(payload.leadDraft){
        updateLeadDraftCard(mergeLeadDraftWithChatContext(payload.leadDraft, userText, attachedFiles));
        if(contactIsReady() && (leadDraftHasRequest(latestLeadDraft) || readAiBitrixLead())){
          syncAiLeadWithBitrix({silent:true, reason:'chat_context_update'}).catch(()=>{});
        }
      }
      if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_response', { ok:response.ok, configured:payload.configured !== false });
    }catch{
      const answer = pendingFiles.some(file=>file.status === 'ошибка')
        ? 'Файл не загрузился. Проверьте формат и размер до 30 МБ, затем попробуйте отправить ещё раз.'
        : 'AI-чат пока не отвечает. Перенесите черновик в форму и оставьте контакты, менеджер подключится к подбору.';
      const errorMessage = addMessage('', 'bot', false);
      setBotMessage(errorMessage, answer);
      remember('assistant', answer);
      if(typeof trackPnpEvent === 'function') trackPnpEvent('ai_chat_error', { page:location.pathname });
    }finally{
      if(submitButton) submitButton.disabled = false;
      if(transferButton) transferButton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded',async()=>{initPnpHeaderLogoRailLock();initPnpLogoVariantPreview();initMenu();initHeaderContactDropdown();initCatalogMegaMenu();initVendorsMegaMenu();initPartnersMegaMenu();syncContacts();initLegalFooterLinks();renderHomeMainBlocks('#homeCategories');await renderPartnersPreview('#featuredPartnersHome',75);await renderPartnersGrid('#partnersGrid');initPartnersFilter();initCatalog();renderVendorPage();initVendorFilterCards();initForm();initAnalytics();initAiChatWidget();});
