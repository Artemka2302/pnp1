// Lightweight DOM unit test, not a browser/visual test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const elements = new Map();
class Element {
  constructor(tag = "div") {
    this.localName = tag;
    this.attrs = new Map();
    this.dataset = {};
    this.events = {};
    this.textContent = "";
    this.innerHTML = "";
    this.hidden = false;
    this.classList = { toggle() {}, contains() { return false; } };
  }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
  setAttribute(name, value) { this.attrs.set(name, value); }
  replaceWith(replacement) {
    for (const [key, value] of elements) if (value === this) elements.set(key, replacement);
  }
  querySelector(selector) { return elements.get(selector) || null; }
  querySelectorAll() { return []; }
  addEventListener(name, listener) { this.events[name] = listener; }
}
const rootNode = { id: "root", kind: "root", title: "Каталог", url: "/catalog/", children: ["direction:eom"],
  seo: { title: "Каталог | ПНП", description: "Россия и Беларусь" }, breadcrumbs: [] };
const direction = { id: "direction:eom", kind: "direction", title: "ЭОМ", url: "/catalog/energy/eom/",
  children: [], parent: "root", hasChildren: false,
  projectSection: { group: "engineering", groupTitle: "ИОС", code: "ЭОМ", title: "ЭОМ" },
  seo: { title: "ЭОМ | ПНП", description: "Подбор по спецификации" },
  breadcrumbs: [{ title: "Каталог", target: "root", url: "/catalog/" },
    { title: "ЭОМ", target: "direction:eom", url: "/catalog/energy/eom/" }] };
for (const selector of [
  "[data-catalog-v2]", "#catalogInitialData", "[data-catalog-v2-index]",
  "[data-catalog-v2-directions]", "[data-catalog-v2-content-section]",
  "[data-catalog-v2-direction-section]", "[data-catalog-v2-content]",
  "[data-catalog-v2-title]", "[data-catalog-v2-kicker]", "[data-catalog-v2-breadcrumbs]",
  "[data-catalog-v2-back]", "[data-catalog-v2-status]", "[data-catalog-v2-root-heading]",
  'meta[name="description"]', 'link[rel="canonical"]', "#catalogBreadcrumbData",
]) elements.set(selector, new Element());
elements.get("[data-catalog-v2-root-heading]").localName = "h1";
elements.get("#catalogInitialData").textContent = JSON.stringify({
  initialTarget: "root", root: { node: rootNode, children: [direction] },
  nodeEndpoint: "/api/catalog-node/", searchEndpoint: "/api/catalog-search/",
});
const document = new Element();
document.createElement = tag => new Element(tag);
document.getElementById = id => elements.get("#" + id);
const location = { origin: "https://example.test", pathname: "/catalog/", search: "" };
const windowEvents = {};
const window = { location, matchMedia: () => ({ matches: false }),
  addEventListener: (name, listener) => { windowEvents[name] = listener; } };
const history = {
  pushState(state, _, url) { this.state = state; location.pathname = url; },
  replaceState(state, _, url) { this.state = state; location.pathname = url; },
};
let requests = 0;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../static/js/catalog-desktop-v2.js"), "utf8"), {
  document, window, location, history, URL, console,
  fetch: async () => { requests++; return { ok: true, json: async () => ({ node: direction, children: [] }) }; },
});
const settle = () => new Promise(resolve => setImmediate(resolve));
async function navigate(target) {
  await elements.get("[data-catalog-v2]").events.click({
    target: { closest: selector => selector === "a[data-catalog-v2-target]"
      ? { dataset: { catalogV2Target: target } } : null },
    button: 0, preventDefault() {},
  });
}
function check(target, tag) {
  const isRoot = target.kind === "root";
  assert.equal(document.title, target.seo.title);
  assert.equal(elements.get('meta[name="description"]').attrs.get("content"), target.seo.description);
  assert.equal(elements.get('link[rel="canonical"]').attrs.get("href"), location.origin + target.url);
  assert.equal(elements.get("[data-catalog-v2-root-heading]").localName, isRoot ? "h1" : "div");
  assert.equal(elements.get("[data-catalog-v2-kicker]").localName, tag);
  assert.equal(elements.get("[data-catalog-v2-content-section]").hidden, isRoot);
  assert.equal(elements.get("[data-catalog-v2-direction-section]").hidden, !isRoot);
}
(async () => {
  await settle();
  check(rootNode, "span");
  await navigate(direction.id);
  check(direction, "h1");
  const schema = JSON.parse(elements.get("#catalogBreadcrumbData").textContent);
  assert.equal(schema.itemListElement[1].item, location.origin + direction.url);
  assert.equal(history.state.catalogTarget, direction.id);
  await navigate("root");
  check(rootNode, "span");
  assert.equal(JSON.parse(elements.get("#catalogBreadcrumbData").textContent), null);
  location.pathname = direction.url;
  // A real browser updates history.state before dispatching popstate.
  history.state = { catalogTarget: direction.id };
  windowEvents.popstate({ state: history.state });
  await settle();
  check(direction, "h1");
  assert.equal(requests, 1);
  await navigate("direction:old-alias");
  check(direction, "h1");
  assert.equal(requests, 2);
  assert.equal(history.state.catalogTarget, direction.id);
  console.log("OK: root, direction, return, popstate, old alias; metadata, canonical, H1, breadcrumbs, cached navigation.");
})().catch(error => { console.error(error); process.exitCode = 1; });
