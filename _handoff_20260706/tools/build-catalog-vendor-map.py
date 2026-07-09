#!/usr/bin/env python3
"""Build a conservative vendor-to-catalog map for the PNP site.

The source files stay separated:
- data/vendors_master.csv is the manufacturer directory.
- data/catalog_master.json is the catalog taxonomy.
- data/catalog_vendor_map.* is the generated bridge used by catalog, AI, CRM
  and audit reports.
"""

from __future__ import annotations

import csv
import html
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
REPORTS_DIR = ROOT / "reports" / "vendor-catalog-map"
VENDORS_CSV = DATA_DIR / "vendors_master.csv"
CATALOG_JSON = DATA_DIR / "catalog_master.json"
OUT_CSV = DATA_DIR / "catalog_vendor_map.csv"
OUT_JSON = DATA_DIR / "catalog_vendor_map.json"
OUT_SUMMARY = DATA_DIR / "catalog_vendor_map_summary.json"
REPORT_CSV = REPORTS_DIR / "vendor_catalog_coverage.csv"
REVIEW_CSV = REPORTS_DIR / "vendor_catalog_manual_review.csv"
MISSING_CSV = REPORTS_DIR / "vendor_catalog_missing_groups_current.csv"
REPORT_HTML = REPORTS_DIR / "vendor_catalog_coverage.html"


GOOD_VENDOR_STATUSES = {"logo_ready", "confirmed_by_user"}
REVIEW_VENDOR_STATUSES = {"manual_review_needed", "needs_review", "logo_not_found"}
NOISE_PATTERNS = (
    "mosbuild",
    "мосбилд",
    "российская строительная неделя",
    "securika",
    "parkseason",
    "экспо",
    "expo",
    "электро 202",
    "прайс-листа нет",
    "все запросы",
    "от 0-250",
    "доставку могут",
)

HOME_VENDOR_SLUGS = {
    "depo-computers",
    "yadro",
    "kvadra",
    "eltex",
    "integra-kabel",
    "systeme-electric",
    "kit",
    "terek-radio",
    "ooo-lipkovskiy-kirpichnyy-zavod",
    "oao-golitsynskiy-keramicheskiy-zavod",
    "ao-keramika-lomintsevskiy-kirpichnyy-zavod",
    "oao-gomelstroymaterialy",
    "kompaniya-ardko",
    "zavod-sloistyh-plastikov",
    "stroioboi",
    "metall-profil",
    "npo-ekosistema",
    "amira",
    "ooo-zavod-uraldorsvet",
    "umekon-uralskiy-zavod-metallokonstruktsiy",
    "doppler",
    "moslift-ao",
    "karacharovskiy-mekhanicheskiy-zavod",
    "vakio",
    "ventart-grupp-ooo",
    "ooo-ikaplast",
    "kompaniya-tekh-aero",
    "aquapolis",
    "zavod-rvk",
    "ooo-dko-poliplastik",
    "proizvodstvennoe-obedinenie-ams-mzmo-asepticheskie-meditsinskie-sistemy-i-miasskiy-zavod-meditsinskogo-oborudovaniya",
}

# These are not "all vendors"; this is the curated public showcase set that is
# allowed to enrich the Partners/Brands surface until business confirms a
# separate partner status list.
PARTNER_SHOWCASE_VENDOR_SLUGS = HOME_VENDOR_SLUGS


# Curated rules are intentionally conservative. They only cover cases where the
# input type has a clear catalog destination. Everything else goes to manual
# review instead of polluting public catalog pages.
TYPE_TO_GROUP_IDS: dict[str, list[str]] = {
    "кирпич": ["bricks"],
    "блоки": ["blocks"],
    "керамзит блоки": ["keramzitobetonnye-bloki"],
    "сэндвич панели": ["sandwich-panels"],
    "сендвич панели": ["sandwich-panels"],
    "жби": ["zhbi"],
    "сваи жби": ["zhbi", "svai"],
    "сваи": ["svai"],
    "опалубка балка": ["formwork"],
    "металл": ["metal"],
    "металлоконструкции и изделия": ["metal"],
    "металлокасеты": ["metallokassety"],
    "металлокассеты": ["metallokassety"],
    "фанера": ["plywood"],
    "древесно плитные": ["plywood", "cement-bonded-particle-board", "dvp-fiberboard", "osb", "mdf", "hdf", "chipboard-dsp", "laminated-chipboard-ldsp", "acpl", "vdsp-sh", "gsp", "lvl", "mdvp-soft-fiberboard", "fibrolite-boards"],
    "осб": ["osb"],
    "осп": ["osb"],
    "завод цсп": ["cement-bonded-particle-board"],
    "gml панели": ["gml-wall-panels", "gml-paneli"],
    "hpl": ["hpl-wall-panels", "facade-hpl-panels"],
    "лкм": ["paints-and-coatings", "kraska"],
    "обои": ["oboi"],
    "плитка керамическая": ["porcelain-tile", "facade-porcelain-slabs"],
    "керамогранит": ["porcelain-tile", "facade-porcelain-slabs", "podsistema-dlya-keramogranita"],
    "потолки и системы": ["ceiling-systems"],
    "все для кровли": ["krovelnye-sistemy"],
    "окна": ["okna", "aluminum-windows-glazing", "pvc-windows"],
    "сантехника": ["mixers", "bathroom-complectation", "rakoviny-i-unitazy", "sanfayans"],
    "насосы": ["water-pumps", "water-fire-pumps", "heat-exchanger-and-pumps"],
    "кнс": ["kns", "indoor-sewage-pumping-stations", "storm-drainage-kns-tanks-filter-cartridges"],
    "водоотведение": ["cast-iron-drainage", "water-fire-pumps", "wastewater-control-valves", "indoor-sewage-pumping-stations", "siphonic-vacuum-storm-drainage", "drenazhn-sistemy-i-vodootvedenie"],
    "трубопроводные системы водоснабжения": ["water-pipes-and-accessories", "goryachee-vodosnabzhenie"],
    "запорная и регулирующая арматура": ["zapornaya-i-reguliruyuschaya-armatura", "water-valves-safety-control"],
    "вентиляция": ["ventilation-system"],
    "радиаторы": ["steel-panel-radiators", "bimetallic-radiators", "radiatory"],
    "труба в ппу": ["truba-v-ppu"],
    "изоляция": ["truba-v-ppu", "uteplitel"],
    "теплоизоляция": ["truba-v-ppu", "uteplitel"],
    "гидроизоляция и теплоизоляция": ["waterproofing", "uteplitel", "krovelnye-sistemy"],
    "пожарная сигнализация и соуэ": ["fire-alarm-systems", "security-and-fire-alarm", "soue", "emergency-notification-and-control-equipment"],
    "охранно-пожарная сигнализация и соуэ": ["fire-alarm-systems", "security-and-fire-alarm", "soue", "emergency-notification-and-control-equipment"],
    "автоматическое пожаротушение": ["automatic-fire-extinguishing-systems", "automatic-sprinkler-fire-extinguishing", "avtomaticheskoe-sprinklernoe-pozharotushenie", "autonomous-fire-extinguishing-system", "aerozolnoe-pozharotushenie", "internal-fire-extinguishing", "vodyanoe-pozharotushenie", "gazovoe-pozharotushenie", "poroshkovoe-pozharotushenie", "automatic-gas-fire-extinguishing"],
    "автоматика пожаротушения и противодымной защиты": ["automatic-fire-extinguishing-systems", "protivodymnaya-zaschita-i-avtomaticheskoe-pozharotushenie", "automatic-gas-fire-extinguishing"],
    "лифты": ["lifty", "passenger-and-cargo-lifts"],
    "электрика": ["elektrika", "switchboard-and-electrical-equipment", "kommutatsionnoe-elektrooborudovanie"],
    "автоматизация и диспетчеризация": ["asu-inzhenernymi-setyami", "sistemy-svyazi-i-dispetcherizatsii", "pass-terminals-and-queue-systems", "sistemy-avtomatizatsii-propusknogo-rezhima"],
    "кабель": ["electrical-cable-products", "kabelnaya-produktsiya"],
    "волоконно-оптический кабель": ["fiber-optic-cable"],
    "светильники": ["luminaires", "lighting-fixtures"],
    "светотехника": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya"],
    "электротехническое оборудование": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya"],
    "электрика и кабеленесущие системы": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "cable-trays", "pvc-cable-management"],
    "ибп и защита электропитания": ["uninterruptible-power-supplies"],
    "опоры освещения": ["poles-and-outdoor-lighting", "opory-osvescheniya"],
    "серверы, схд, коммутаторы, инфраструктурные компоненты, рабочие станции": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "datacenter-infrastructure-components", "workstations-and-corporate-pcs"],
    "серверы схд коммутаторы инфраструктурные компоненты рабочие станции": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "datacenter-infrastructure-components", "workstations-and-corporate-pcs"],
    "серверы, системы хранения, коммутаторы, по, интегрированные решения": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "software-monitoring-and-virtualization"],
    "серверы системы хранения коммутаторы по интегрированные решения": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "software-monitoring-and-virtualization", "programmnoe-obespechenie", "datacenter-infrastructure-components"],
    "пк, моноблоки, ноутбуки, планшеты, клиентские устройства": ["all-in-one-laptops-and-tablets", "personalnoe-oborudovanie"],
    "пк моноблоки ноутбуки планшеты клиентские устройства": ["all-in-one-laptops-and-tablets", "personalnoe-oborudovanie"],
    "активное оборудование лвс": ["active-lan-equipment", "network-switches", "setevoe-oborudovanie-i-telekom"],
    "it оборудование и по": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "software-monitoring-and-virtualization"],
    "серверы, системы хранения, коммутаторы, по, интегрированные решения": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "software-monitoring-and-virtualization", "programmnoe-obespechenie", "datacenter-infrastructure-components"],
    "информационная безопасность": ["informatsionnaya-bezopasnost"],
    "интерактивное оборудование": ["interaktivnoe-oborudovanie"],
    "операционные системы виртуализация и управление ит-инфраструктурой": ["operatsionnye-sistemy", "virtualizatsiya-i-vdi", "upravlenie-it-infrastrukturoy"],
    "резервное копирование": ["rezervnoe-kopirovanie"],
    "управление данными и аналитика": ["upravlenie-dannymi-i-analitika"],
    "платформы разработки и сборки по": ["platformy-razrabotki-i-sborki-po"],
    "лаборатор оборуд": ["laboratornoe-oborudovanie"],
    "гипсокартон и сухие смеси": ["drywall", "drywall-profile", "profil-dlya-gipsokartona", "gypsum-partition-blocks", "plasters-and-leveling-compounds", "suhie-smesi"],
    "гипсокартон": ["drywall", "drywall-profile", "profil-dlya-gipsokartona", "gypsum-partition-blocks"],
    "сухие смеси": ["plasters-and-leveling-compounds", "suhie-smesi"],
    "акустические потолки": ["ceiling-systems", "akusticheskie-resheniya"],
    "опалубка и строительные леса": ["formwork", "scaffolding"],
    "сантехническая арматура": ["zapornaya-i-reguliruyuschaya-armatura", "water-valves-safety-control", "wastewater-control-valves"],
    "сантехническая керамика": ["bathroom-complectation", "rakoviny-i-unitazy", "sanfayans"],
    "вентиляция и климат": ["ventilation-system", "air-disinfection-system", "vrf-vrv-and-split-systems", "vrf-vrv-i-split-sistemy"],
    "радиаторы и отопление": ["steel-panel-radiators", "bimetallic-radiators", "radiatory", "konvektory"],
    "оконные системы": ["okna", "aluminum-windows-glazing", "pvc-windows"],
    "алюминиевые профильные системы": ["aluminum-windows-glazing", "facade-substructure"],
    "слаботочная связь и видео": ["video-surveillance-equipment", "video-surveillance-systems", "telefoniya", "sistemy-svyazi-i-dispetcherizatsii", "kommunikatsii-i-svyaz"],
    "слаботочная инфраструктура": ["active-lan-equipment", "fiber-optic-cable", "sks-kns-i-inzhenernoe-oborudovanie", "setevoe-oborudovanie-i-telekom"],
    "электронная очередь и пропускной режим": ["pass-terminals-and-queue-systems", "sistemy-avtomatizatsii-propusknogo-rezhima"],
    "медицинская визуализация и диагностика": ["visualization-and-diagnostics"],
    "медицина, госпиталя": ["medical-gases", "meditsinskoe-oborudovanie"],
    "комплексы чистых помещений": ["medical-gases", "meditsinskoe-oborudovanie"],
    "маф": ["street-furniture-and-small-architectural-forms", "sadovaya-mebel"],
    "напольные покрытия": ["linoleum", "laminat"],
    "скуд и запирающие устройства": ["locking-devices", "access-control-equipment", "skud", "sistemy-kontrolya-i-upravleniya-dostupom"],
    "фасадные системы": ["ventilated-facade-systems", "metallokassety", "facade-substructure"],
    "строит. инструм": ["krepezh"],
}


VENDOR_SLUG_TO_GROUP_IDS: dict[str, list[str]] = {
    "kabelnyy-alyans": ["electrical-cable-products", "kabelnaya-produktsiya"],
    "braer": ["bricks", "paving-slabs-and-pavers"],
    "k-flex": ["truba-v-ppu", "uteplitel"],
    "korf": ["ventilation-system", "air-disinfection-system"],
    "wilo": ["water-pumps", "water-fire-pumps", "heat-exchanger-and-pumps"],
    "schneider-electric": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya", "asu-inzhenernymi-setyami", "input-distribution-device"],
    "tehnonikol": ["waterproofing", "uteplitel", "krovelnye-sistemy"],
    "knauf": ["drywall", "drywall-profile", "profil-dlya-gipsokartona", "gypsum-partition-blocks", "plasters-and-leveling-compounds", "suhie-smesi", "ceiling-systems"],
    "volma": ["drywall", "gypsum-partition-blocks", "plasters-and-leveling-compounds", "suhie-smesi"],
    "gyproc": ["drywall", "drywall-profile", "profil-dlya-gipsokartona"],
    "rockwool": ["uteplitel"],
    "kerama-marazzi": ["porcelain-tile", "facade-porcelain-slabs"],
    "magma": ["drywall", "gypsum-partition-blocks"],
    "unitile": ["porcelain-tile", "facade-porcelain-slabs"],
    "ecler": ["assembly-hall-equipment", "media-apparatus", "mediynoe-oborudovanie", "aktovyy-zal"],
    "midea": ["ventilation-system", "vrf-vrv-and-split-systems", "vrf-vrv-i-split-sistemy"],
    "itk": ["active-lan-equipment", "fiber-optic-cable", "sks-kns-i-inzhenernoe-oborudovanie", "network-switches", "setevoe-oborudovanie-i-telekom"],
    "ledel": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya", "architectural-and-street-lighting"],
    "fereks": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya", "architectural-and-street-lighting"],
    "oni": ["asu-inzhenernymi-setyami", "sistemy-svyazi-i-dispetcherizatsii", "pass-terminals-and-queue-systems", "sistemy-avtomatizatsii-propusknogo-rezhima"],
    "masterscada": ["asu-inzhenernymi-setyami", "sistemy-svyazi-i-dispetcherizatsii"],
    "profesco": ["asu-inzhenernymi-setyami", "sistemy-svyazi-i-dispetcherizatsii"],
    "generica": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya"],
    "ambiot": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting"],
    "roca": ["bathroom-complectation", "rakoviny-i-unitazy", "sanfayans", "oborudovanie-sanuzlov", "wall-hung-toilet-kit"],
    "peri": ["formwork", "scaffolding"],
    "navigator": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya", "architectural-and-street-lighting"],
    "glims": ["plasters-and-leveling-compounds", "suhie-smesi"],
    "santek": ["bathroom-complectation", "rakoviny-i-unitazy", "sanfayans", "oborudovanie-sanuzlov", "wall-hung-toilet-kit"],
    "veka": ["okna", "aluminum-windows-glazing", "pvc-windows"],
    "bergauf": ["plasters-and-leveling-compounds", "suhie-smesi"],
    "ani-plast": ["zapornaya-i-reguliruyuschaya-armatura", "water-valves-safety-control", "wastewater-control-valves"],
    "clivet": ["ventilation-system", "vrf-vrv-and-split-systems", "vrf-vrv-i-split-sistemy"],
    "iva": ["telefoniya", "sistemy-svyazi-i-dispetcherizatsii", "kommunikatsii-i-svyaz"],
    "iru": ["workstations-and-corporate-pcs", "personalnoe-oborudovanie", "all-in-one-laptops-and-tablets"],
    "rifar": ["steel-panel-radiators", "bimetallic-radiators", "radiatory", "konvektory"],
    "kentatsu": ["ventilation-system", "vrf-vrv-and-split-systems", "vrf-vrv-i-split-sistemy"],
    "ecophon": ["ceiling-systems", "akusticheskie-resheniya"],
    "kontaktor": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya"],
    "prado": ["steel-panel-radiators", "bimetallic-radiators", "radiatory", "konvektory"],
    "idis": ["video-surveillance-equipment", "video-surveillance-systems"],
    "akvalid": ["water-pipes-and-accessories", "goryachee-vodosnabzhenie", "water-valves-safety-control", "water-treatment-equipment"],
    "sanita": ["bathroom-complectation", "rakoviny-i-unitazy", "sanfayans", "oborudovanie-sanuzlov"],
    "melke": ["okna", "aluminum-windows-glazing", "pvc-windows"],
    "chzsk": ["bricks"],
    "alroks": ["aluminum-windows-glazing", "facade-substructure"],
    "aktivstok": ["cast-iron-drainage", "indoor-sewage-pumping-stations", "siphonic-vacuum-storm-drainage", "drenazhn-sistemy-i-vodootvedenie", "stormwater-treatment-facilities-group", "los"],
    "kaleva": ["okna", "aluminum-windows-glazing", "pvc-windows"],
    "santeri": ["bathroom-complectation", "rakoviny-i-unitazy", "sanfayans", "oborudovanie-sanuzlov"],
    "alfamatika": ["pass-terminals-and-queue-systems", "sistemy-avtomatizatsii-propusknogo-rezhima"],
    "ardatovskiy-svetotehnicheskiy-zavod": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya", "architectural-and-street-lighting"],
    "tarkett": ["linoleum", "laminat", "komplektuyuschie-k-linoleumu", "plintus", "podlozhka"],
    "metall-profil": ["krovelnye-sistemy", "profnastil"],
    "grand-line": ["facade-substructure", "metallokassety", "ventilated-facade-systems", "profnastil", "aluminum-cassettes", "podsistema-dlya-keramogranita", "zabory"],
    "nordfox": ["facade-substructure", "ventilated-facade-systems", "podsistema-dlya-keramogranita"],
    "zavod-sloistyh-plastikov": ["hpl-wall-panels", "facade-hpl-panels", "santehnicheskie-peregorodki"],
    "ooo-ferroni": ["dveri", "steel-and-fire-doors"],
    "feron": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya", "architectural-and-street-lighting", "busbar-systems"],
    "gauss": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "poles-and-outdoor-lighting", "opory-osvescheniya", "architectural-and-street-lighting", "busbar-systems"],
    "fujifilm": ["visualization-and-diagnostics", "meditsinskoe-oborudovanie"],
    "olympus": ["visualization-and-diagnostics", "meditsinskoe-oborudovanie"],
    "pentax-medical": ["visualization-and-diagnostics", "meditsinskoe-oborudovanie"],
    "philips": ["cardiology-and-emergency-care", "visualization-and-diagnostics", "meditsinskoe-oborudovanie"],
    "b-braun": ["infusion-therapy-and-temperature-management", "meditsinskoe-oborudovanie"],
    "mindray": ["cardiology-and-emergency-care", "anesthesiology-and-intensive-care", "infusion-therapy-and-temperature-management", "visualization-and-diagnostics", "meditsinskoe-oborudovanie"],
    "kompaniya-reatorg": ["laboratornoe-oborudovanie"],
    "ooo-energolab": ["laboratornoe-oborudovanie"],
    "tsentr-komplektatsii-oborudovaniem": ["water-pumps"],
    "bolid": ["fire-alarm-systems", "security-and-fire-alarm", "soue", "emergency-notification-and-control-equipment", "intrusion-controllers-detectors", "sistemy-ohrannoy-signalizatsii", "protivodymnaya-zaschita-i-avtomaticheskoe-pozharotushenie"],
    "rubezh": ["fire-alarm-systems", "security-and-fire-alarm", "soue", "emergency-notification-and-control-equipment", "intrusion-controllers-detectors", "sistemy-ohrannoy-signalizatsii", "protivodymnaya-zaschita-i-avtomaticheskoe-pozharotushenie"],
    "zavod-rvk": ["mixers", "bathroom-complectation", "rakoviny-i-unitazy", "sanfayans", "truba-polipropilen"],
    "salini": ["bathroom-complectation", "rakoviny-i-unitazy", "sanfayans", "oborudovanie-sanuzlov"],
    "torgovyy-dom-misti": ["bathroom-complectation", "oborudovanie-sanuzlov"],
    "ooo-npp-magnito-kontakt": ["intrusion-controllers-detectors", "sistemy-ohrannoy-signalizatsii", "security-and-fire-alarm"],
    "nizhegorodskiy-opytno-eksperimentalnyy-zavod": ["krepezh"],
    "ooo-alfapol": ["toppingovyy-betonnyy-pol"],
    "ooo-afk-lider": ["facade-substructure", "ventilated-facade-systems", "aluminum-windows-glazing"],
    "ooo-bronoteks": ["steel-and-fire-doors", "dveri"],
    "ooo-izomaks-rus": ["krepezh"],
    "ooo-pf-hammer": ["steel-and-fire-doors", "dveri"],
    "ooo-nevidimye-reshetki": ["ventilation-system"],
    "ooo-tehnoservis": ["luminaires", "lighting-fixtures", "commercial-interior-linear-recessed-lighting", "architectural-and-street-lighting", "ceiling-systems", "busbar-systems"],
    "ooo-fabrika-lestnits-eyfel": ["scaffolding"],
    "tpk-tatpolimer": ["siphonic-vacuum-storm-drainage", "krovelnye-sistemy"],
    "systeme-electric": ["servers", "storage-systems", "servery-i-shd", "network-switches", "setevoe-oborudovanie-i-telekom", "software-monitoring-and-virtualization", "input-distribution-device"],
    "tdm-electric": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya", "input-distribution-device"],
    "ekf": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya", "input-distribution-device"],
    "dekraft": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "elektroustanovochnye-izdeliya", "input-distribution-device"],
    "dkc": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "cable-trays", "pvc-cable-management", "cable-support-systems", "molniezaschita", "lightning-protection-and-grounding"],
    "lc-kabel": ["electrical-cable-products", "kabelnaya-produktsiya"],
    "opytno-konstruktorskoe-predpriyatie-elka-kabel": ["electrical-cable-products", "kabelnaya-produktsiya"],
    "segmentenergo-kabelnyy-zavod": ["electrical-cable-products", "kabelnaya-produktsiya"],
    "elektrotehmash-kabelnyy-zavod": ["electrical-cable-products", "kabelnaya-produktsiya"],
    "elektroschit": ["switchboard-and-electrical-equipment", "elektrika", "kommutatsionnoe-elektrooborudovanie", "schitovoe-oborudovanie", "bktp-brp-vru", "uzly-sistemy-elektrosnabzheniya"],
    "elektrik-art": ["luminaires", "lighting-fixtures", "architectural-and-street-lighting"],
    "dormakaba": ["locking-devices", "access-control-equipment", "skud", "sistemy-kontrolya-i-upravleniya-dostupom", "access-and-control-systems"],
    "oao-gomelzhelezobeton": ["zhbi", "fbs-bloki", "beton", "pag"],
    "magelan": ["sml-wall-panels", "sml-paneli"],
    "ob-lift-kompleks-ds": ["elevator-dispatch-communication", "avtomatizatsiya-i-dispetcherizatsiya"],
    "doppler": ["eskalatory-i-travolatory"],
    "otis-ranee-meteor-lift": ["eskalatory-i-travolatory"],
    "kompaniya-dok-17": ["soft-and-office-furniture", "mebel", "ofisnaya-mebel"],
    "byurokrat": ["soft-and-office-furniture", "mebel", "ofisnaya-mebel"],
    "gefesd": ["industrial-furniture"],
    "yarus": ["bibliotechnoe-oborudovanie", "stellazhi"],
    "praktik": ["stellazhi", "oborudovanie-garderoba", "hozyaystvennoe-oborudovanie"],
    "perco": ["dosmotrovoe-oborudovanie", "skud", "sistemy-kontrolya-i-upravleniya-dostupom", "access-control-equipment"],
    "blokpost": ["dosmotrovoe-oborudovanie"],
    "romana": ["sportivnoe-oborudovanie"],
    "ezois": ["bktp-brp-vru", "uzly-sistemy-elektrosnabzheniya"],
    "cheaz": ["bktp-brp-vru", "uzly-sistemy-elektrosnabzheniya"],
    "zeto": ["bktp-brp-vru", "uzly-sistemy-elektrosnabzheniya"],
    "rusinzh": ["industrial-electric-water-heaters"],
    "tiflocentre": [
        "folding-ramps",
        "accessibility-lifts",
        "accessibility-handrails",
        "accessibility-ramps-and-traps",
        "podemnye-platformy",
        "pandusy",
        "informatsionnoe-obespechenie",
        "taktilnaya-plitka",
    ],
    "keyguard": ["automatic-key-issue-systems"],
    "tochka-impeks": ["perimeter-controllers-detectors"],
    "zarya-impeks": ["brackets-mounting-units-and-luminaires"],
    "bastion-3-es-prom": ["ssoi-software-hardware-complexes"],
    "zavod-dorozhnyh-konstruktsiy-solamir": ["zakladnye-detali"],
    "zms-setka": ["setka"],
    "reco": ["mufty-obzhimnye-dlya-armatury"],
    "bonolit": ["gazobetonnye-bloki"],
    "penoblok-ru": ["penobloki"],
    "abat": ["oborudovanie-pischebloka", "oborudovanie-stolovoy"],
    "teplomash": ["teplovye-zavesy"],
    "ballu": ["teplovye-zavesy"],
    "parus-electro": ["zaryadochnye-stantsii-dlya-elektromobiley"],
    "the-edison": ["zaryadochnye-stantsii-dlya-elektromobiley"],
    "interfloor": ["falshpoly"],
    "elakor": ["toppingovyy-betonnyy-pol"],
    "nnk": ["scheben"],
    "tech-krep": ["krepezh"],
    "komitex": ["geotekstil"],
    "vzljot": ["uzly-ucheta-vody"],
    "polyplastic": ["naruzhnye-seti-vodosnabzheniya-i-kanalizatsii"],
    "rusdorznak": ["dorozhnye-znaki"],
}


def normalize(value: str) -> str:
    text = str(value or "").strip().lower().replace("ё", "е")
    text = text.replace("–", "-").replace("—", "-").replace("‑", "-")
    text = re.sub(r"[\"'«»()\[\]{}.,;:!?/\\|]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace(";", ",")).strip()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def iter_catalog_groups(master: dict[str, Any]):
    for block in master.get("global_blocks", []):
        for direction in block.get("directions", []):
            for system in direction.get("systems", []):
                for group in system.get("product_groups", []):
                    yield {
                        "global_block_id": block.get("id", ""),
                        "global_block_title": block.get("title", ""),
                        "direction_id": direction.get("id", ""),
                        "direction_title": direction.get("title", ""),
                        "system_id": system.get("id", ""),
                        "system_title": system.get("title", ""),
                        "product_group_id": group.get("id", ""),
                        "product_group_title": group.get("title", ""),
                        "product_types": group.get("product_types", []) or [],
                        "brands": group.get("brands", []) or [],
                        "aliases": (group.get("ai") or {}).get("aliases", []) or [],
                    }


def build_catalog_indexes(master: dict[str, Any]):
    groups = list(iter_catalog_groups(master))
    by_id = {item["product_group_id"]: item for item in groups}
    by_norm: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in groups:
        tokens = [
            item["product_group_id"],
            item["product_group_title"],
            item["system_id"],
            item["system_title"],
            *item["product_types"],
            *item["aliases"],
        ]
        for token in tokens:
            key = normalize(str(token))
            if key:
                by_norm[key].append(item)
    return groups, by_id, by_norm


def is_noise_vendor(row: dict[str, str]) -> bool:
    joined = normalize(" ".join(row.get(key, "") for key in ("vendor_name", "normalized_name", "type", "notes")))
    return any(pattern in joined for pattern in NOISE_PATTERNS)


def candidate_groups_for_vendor(row: dict[str, str], by_id: dict[str, dict[str, Any]], by_norm: dict[str, list[dict[str, Any]]]) -> tuple[list[dict[str, Any]], str, str]:
    slug_key = normalize(row.get("slug", ""))
    if slug_key in VENDOR_SLUG_TO_GROUP_IDS:
        groups = [by_id[group_id] for group_id in VENDOR_SLUG_TO_GROUP_IDS[slug_key] if group_id in by_id]
        if groups:
            return groups, "curated_vendor_slug", row.get("slug", "")

    raw_type = clean(row.get("type", ""))
    type_key = normalize(raw_type)
    if type_key in TYPE_TO_GROUP_IDS:
        groups = [by_id[group_id] for group_id in TYPE_TO_GROUP_IDS[type_key] if group_id in by_id]
        if groups:
            return groups, "curated_type_alias", raw_type

    search_tokens = [
        row.get("type", ""),
        row.get("area", ""),
        row.get("group", ""),
    ]
    for token in search_tokens:
        key = normalize(token)
        if key in by_norm:
            # Keep exact title/id matches. Product type aliases can match several
            # groups; that is acceptable only when still explicit.
            return by_norm[key], "exact_catalog_match", clean(token)

    return [], "manual_review", raw_type


def build_map() -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    master = json.loads(CATALOG_JSON.read_text(encoding="utf-8-sig"))
    vendors = read_csv(VENDORS_CSV)
    groups, by_id, by_norm = build_catalog_indexes(master)

    rows: list[dict[str, Any]] = []
    review_rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for vendor in vendors:
        vendor_slug = clean(vendor.get("slug", ""))
        vendor_name = clean(vendor.get("vendor_name") or vendor.get("normalized_name", ""))
        status = clean(vendor.get("status", ""))
        if not vendor_slug or not vendor_name:
            continue

        if is_noise_vendor(vendor) and normalize(vendor_slug) not in VENDOR_SLUG_TO_GROUP_IDS:
            review_rows.append({
                "vendor_slug": vendor_slug,
                "vendor_name": vendor_name,
                "reason": "source_noise_or_event",
                "direction": clean(vendor.get("direction", "")),
                "group": clean(vendor.get("group", "")),
                "area": clean(vendor.get("area", "")),
                "type": clean(vendor.get("type", "")),
                "status": status,
                "notes": clean(vendor.get("notes", "")),
            })
            continue

        matches, confidence, matched_by = candidate_groups_for_vendor(vendor, by_id, by_norm)
        if not matches:
            review_rows.append({
                "vendor_slug": vendor_slug,
                "vendor_name": vendor_name,
                "reason": "no_catalog_group_match",
                "direction": clean(vendor.get("direction", "")),
                "group": clean(vendor.get("group", "")),
                "area": clean(vendor.get("area", "")),
                "type": clean(vendor.get("type", "")),
                "status": status,
                "notes": clean(vendor.get("notes", "")),
            })
            continue

        map_status = "published" if status in GOOD_VENDOR_STATUSES else "manual_review"
        show_in_catalog = map_status == "published"
        has_logo = bool(clean(vendor.get("logo", "")))
        for group in matches:
            key = (vendor_slug, group["product_group_id"])
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "vendor_slug": vendor_slug,
                "vendor_name": vendor_name,
                "official_site": clean(vendor.get("official_site", "")),
                "logo": clean(vendor.get("logo", "")),
                "logo_source_url": clean(vendor.get("logo_source_url", "")),
                "global_block_id": group["global_block_id"],
                "global_block_title": group["global_block_title"],
                "direction_id": group["direction_id"],
                "direction_title": group["direction_title"],
                "system_id": group["system_id"],
                "system_title": group["system_title"],
                "product_group_id": group["product_group_id"],
                "product_group_title": group["product_group_title"],
                "source_direction": clean(vendor.get("direction", "")),
                "source_group": clean(vendor.get("group", "")),
                "source_area": clean(vendor.get("area", "")),
                "source_type": clean(vendor.get("type", "")),
                "show_in_catalog": str(show_in_catalog).lower(),
                "show_in_vendors": "true",
                "show_on_home": str(show_in_catalog and has_logo and vendor_slug in HOME_VENDOR_SLUGS).lower(),
                "show_in_partners": str(show_in_catalog and has_logo and vendor_slug in PARTNER_SHOWCASE_VENDOR_SLUGS).lower(),
                "status": map_status,
                "confidence": confidence,
                "matched_by": matched_by,
                "source": clean(vendor.get("source", "")),
                "notes": clean(vendor.get("notes", "")),
            })

    mapped_group_ids = {row["product_group_id"] for row in rows if row["show_in_catalog"] == "true"}
    coverage_rows = []
    group_vendor_counts = Counter(row["product_group_id"] for row in rows if row["show_in_catalog"] == "true")
    for group in groups:
        coverage_rows.append({
            "global_block_title": group["global_block_title"],
            "direction_title": group["direction_title"],
            "system_title": group["system_title"],
            "product_group_id": group["product_group_id"],
            "product_group_title": group["product_group_title"],
            "mapped_vendors": group_vendor_counts.get(group["product_group_id"], 0),
            "coverage": "covered" if group["product_group_id"] in mapped_group_ids else "missing",
        })

    mapped_manual_review_rows = sum(1 for row in rows if row["status"] == "manual_review")
    unmapped_manual_review_rows = len(review_rows)
    summary = {
        "vendors_total": len(vendors),
        "catalog_product_groups_total": len(groups),
        "map_rows_total": len(rows),
        "published_map_rows": sum(1 for row in rows if row["show_in_catalog"] == "true"),
        "manual_review_rows": unmapped_manual_review_rows + mapped_manual_review_rows,
        "unmapped_manual_review_rows": unmapped_manual_review_rows,
        "mapped_manual_review_rows": mapped_manual_review_rows,
        "covered_product_groups": len(mapped_group_ids),
        "missing_product_groups": len(groups) - len(mapped_group_ids),
        "by_direction": dict(Counter(row["direction_title"] for row in rows if row["show_in_catalog"] == "true")),
        "by_confidence": dict(Counter(row["confidence"] for row in rows)),
        "generated_from": {
            "vendors": str(VENDORS_CSV.relative_to(ROOT)),
            "catalog": str(CATALOG_JSON.relative_to(ROOT)),
        },
    }
    return rows, review_rows, {"summary": summary, "coverage_rows": coverage_rows}


def write_html_report(summary: dict[str, Any], coverage_rows: list[dict[str, Any]], review_rows: list[dict[str, Any]]) -> None:
    missing = [row for row in coverage_rows if row["coverage"] == "missing"]
    top_missing = missing[:80]
    html_rows = "\n".join(
        "<tr>"
        f"<td>{html.escape(row['global_block_title'])}</td>"
        f"<td>{html.escape(row['direction_title'])}</td>"
        f"<td>{html.escape(row['system_title'])}</td>"
        f"<td>{html.escape(row['product_group_title'])}</td>"
        f"<td>{row['mapped_vendors']}</td>"
        f"<td>{html.escape(row['coverage'])}</td>"
        "</tr>"
        for row in top_missing
    )
    review_html = "\n".join(
        "<tr>"
        f"<td>{html.escape(row['vendor_name'])}</td>"
        f"<td>{html.escape(row['type'])}</td>"
        f"<td>{html.escape(row['reason'])}</td>"
        f"<td>{html.escape(row['status'])}</td>"
        "</tr>"
        for row in review_rows[:80]
    )
    REPORT_HTML.parent.mkdir(parents=True, exist_ok=True)
    REPORT_HTML.write_text(
        f"""<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<title>PNP vendor catalog coverage</title>
<style>
body{{font-family:Arial,sans-serif;background:#0d1b2f;color:#eef4ff;margin:0;padding:28px}}
h1,h2{{margin:0 0 14px}}
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:20px 0}}
.card{{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px;background:rgba(255,255,255,.05)}}
.card b{{display:block;font-size:28px;color:#ffb2cc}}
table{{width:100%;border-collapse:collapse;margin:12px 0 28px;background:rgba(255,255,255,.04)}}
th,td{{border-bottom:1px solid rgba(255,255,255,.1);padding:9px;text-align:left;vertical-align:top}}
th{{color:#ffb2cc;font-size:12px;text-transform:uppercase;letter-spacing:.08em}}
</style>
<h1>PNP: карта поставщиков по каталогу</h1>
<div class="cards">
  <div class="card"><span>Всего производителей</span><b>{summary['vendors_total']}</b></div>
  <div class="card"><span>Связей с каталогом</span><b>{summary['published_map_rows']}</b></div>
  <div class="card"><span>Покрыто товарных групп</span><b>{summary['covered_product_groups']}</b></div>
  <div class="card"><span>Без поставщика</span><b>{summary['missing_product_groups']}</b></div>
</div>
<h2>Первые непокрытые товарные группы</h2>
<table><thead><tr><th>Блок</th><th>Направление</th><th>Система</th><th>Группа</th><th>Поставщиков</th><th>Статус</th></tr></thead><tbody>{html_rows}</tbody></table>
<h2>Ручная проверка</h2>
<table><thead><tr><th>Поставщик</th><th>Тип из таблицы</th><th>Причина</th><th>Статус</th></tr></thead><tbody>{review_html}</tbody></table>
""",
        encoding="utf-8",
    )


def main() -> int:
    rows, review_rows, report = build_map()
    fields = [
        "vendor_slug", "vendor_name", "official_site", "logo", "logo_source_url",
        "global_block_id", "global_block_title", "direction_id", "direction_title",
        "system_id", "system_title", "product_group_id", "product_group_title",
        "source_direction", "source_group", "source_area", "source_type",
        "show_in_catalog", "show_in_vendors", "show_on_home", "show_in_partners",
        "status", "confidence", "matched_by", "source", "notes",
    ]
    review_fields = ["vendor_slug", "vendor_name", "reason", "direction", "group", "area", "type", "status", "notes"]
    coverage_fields = ["global_block_title", "direction_title", "system_title", "product_group_id", "product_group_title", "mapped_vendors", "coverage"]

    write_csv(OUT_CSV, rows, fields)
    OUT_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_SUMMARY.write_text(json.dumps(report["summary"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_csv(REVIEW_CSV, review_rows, review_fields)
    write_csv(REPORT_CSV, report["coverage_rows"], coverage_fields)
    write_csv(MISSING_CSV, [row for row in report["coverage_rows"] if row["coverage"] == "missing"], coverage_fields)
    write_html_report(report["summary"], report["coverage_rows"], review_rows)

    print(f"Built {OUT_CSV.relative_to(ROOT)}")
    print(f"Built {OUT_JSON.relative_to(ROOT)}")
    print(f"Report {REPORT_HTML.relative_to(ROOT)}")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
