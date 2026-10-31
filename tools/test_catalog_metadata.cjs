// Pure DOM-stub regression test, not a substitute for a browser/visual review.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../static/js/catalog-desktop-v2.js'), 'utf8');
const elements = new Map();
const element = key => {
  if (!elements.has(key)) elements.set(key, { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  return elements.get(key);
};
const location = { origin: 'https://pnp1.ru', pathname: '/catalog/', search: '?q=Eltex' };
const navigate = (_state, _title, url) => {
  const next = new URL(url, location.origin);
  location.pathname = next.pathname;
  location.search = next.search;
};
const context = vm.createContext({
  URL, location, window: { location }, history: { pushState: navigate, replaceState: navigate },
  document: { querySelector: element, getElementById: element },
  rootHeading: {}, contentKicker: {}, headingTag: (_element, tag) => ({ localName: tag }),
});
const historyCode = source.slice(source.indexOf('  const updateHistory ='), source.indexOf('  const headingTag ='));
const metadataCode = source.slice(source.indexOf('  const updatePageMetadata ='), source.indexOf('  const renderTarget ='));
assert.ok(historyCode && metadataCode, 'Production metadata functions must exist');
vm.runInContext(historyCode + metadataCode + '\nthis.update = updatePageMetadata; this.go = updateHistory;', context);
const root = { kind: 'root', id: 'root', title: 'Каталог', url: '/catalog/', breadcrumbs: [], seo: { title: 'Каталог ПНП', description: 'Материалы' } };
context.update(root);
context.go(root, 'replace');
assert.equal(location.search, '?q=Eltex');
assert.equal(element('catalogRobots').attrs.content, 'noindex,follow');
const group = { kind: 'group', id: 'group:test', title: 'Коммутаторы', url: '/catalog/test/',
  breadcrumbs: [{ title: 'Каталог', url: '/catalog/' }, { title: 'Коммутаторы', url: '/catalog/test/' }],
  seo: { title: 'Коммутаторы ПНП', description: 'Подбор коммутаторов' } };
context.update(group);
context.go(group, 'push');
assert.equal(element('catalogRobots').attrs.content, 'index,follow');
assert.equal(element('meta[property="og:title"]').attrs.content, group.seo.title);
assert.equal(element('meta[property="og:description"]').attrs.content, group.seo.description);
assert.equal(element('link[rel="canonical"]').attrs.href, 'https://pnp1.ru/catalog/test/');
const schema = JSON.parse(element('catalogCollectionData').textContent);
assert.equal(schema.url, element('meta[property="og:url"]').attrs.content);
assert.equal(schema.name, group.title);
assert.equal(schema.breadcrumb['@id'], JSON.parse(element('catalogBreadcrumbData').textContent)['@id']);
location.pathname = '/catalog/'; location.search = '?q=Eltex';
context.update(root); context.go(root, 'none');
assert.equal(element('catalogRobots').attrs.content, 'noindex,follow');
assert.equal(JSON.parse(element('catalogCollectionData').textContent).breadcrumb, undefined);
assert.equal(JSON.parse(element('catalogBreadcrumbData').textContent), null);
assert.equal(context.rootHeading.localName, 'h1');
console.log('OK: initial query, clean navigation, history return, OG, canonical and schema synchronization.');
