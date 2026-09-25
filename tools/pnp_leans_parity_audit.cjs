const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const edgeExecutable = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const projectRoot = path.resolve(__dirname, "..");
const reportRoot = path.join(projectRoot, "reports", "pnp-leans-parity");
const profileRoot = path.join(reportRoot, "edge-profile");
const debuggerPort = 9338;

const sites = [
  { name: "leans", baseUrl: process.env.LEANS_AUDIT_URL || "http://127.0.0.1:8020" },
  { name: "pnp", baseUrl: process.env.PNP_AUDIT_URL || "http://127.0.0.1:8017" },
];
const routes = [
  { name: "home", path: "/" },
  { name: "about", path: "/about/" },
  { name: "catalog", path: "/catalog/" },
  { name: "vendors", path: "/vendors/" },
  { name: "partners", path: "/partners/" },
  { name: "contacts", path: "/contacts/" },
];
const requiredViewports = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "543x1020", width: 543, height: 1020 },
  { name: "614x1020", width: 614, height: 1020 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
];

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
        else pending.resolve(message.result || {});
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const listeners = this.listeners.get(method) || [];
      const listener = params => {
        clearTimeout(timer);
        this.listeners.set(method, listeners.filter(item => item !== listener));
        resolve(params);
      };
      listeners.push(listener);
      this.listeners.set(method, listeners);
      const timer = setTimeout(() => {
        this.listeners.set(method, listeners.filter(item => item !== listener));
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

const waitForDebugger = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Edge remote debugger did not start");
};

const createTab = async () => {
  const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/new?about%3Ablank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Cannot create audit tab: ${response.status}`);
  return response.json();
};

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Page evaluation failed");
  return result.result?.value;
};

const navigate = async (client, url, viewport) => {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
  const loaded = client.waitFor("Page.loadEventFired", 15000);
  await client.send("Page.navigate", { url });
  await loaded;
  await delay(350);
  await evaluate(client, `(() => {
    const body = document.body;
    localStorage.setItem("pnp_cookie_consent", JSON.stringify({
      choice: "rejected",
      consent_version: body?.dataset.consentVersion || "",
      privacy_version: body?.dataset.privacyVersion || "",
      cookie_text_version: body?.dataset.cookieVersion || "",
      consent_id: "local-parity-audit",
      timestamp: new Date().toISOString()
    }));
    document.querySelector("[data-cookie-consent]")?.setAttribute("hidden", "");
    const style = document.createElement("style");
    style.dataset.parityAudit = "";
    style.textContent = "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}";
    document.head.appendChild(style);
    scrollTo(0, 0);
  })()`);
  await delay(100);
};

const screenshot = async (client, outputPath, fullPage = false) => {
  const params = { format: "png", fromSurface: true, captureBeyondViewport: fullPage };
  if (fullPage) {
    const metrics = await client.send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize || metrics.contentSize;
    params.clip = { x: 0, y: 0, width: size.width, height: Math.min(size.height, 24000), scale: 1 };
  }
  const result = await client.send("Page.captureScreenshot", params);
  fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
};

const collectMetrics = client => evaluate(client, `(() => {
  const visible = element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const describe = element => {
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || "",
      className: typeof element.className === "string" ? element.className.slice(0, 140) : "",
      text: (element.innerText || element.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 120),
      rect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
    };
  };
  const interactive = [...document.querySelectorAll("a,button,input,select,textarea,[role=tab],[role=menuitem]")].filter(visible);
  const clippedInteractive = interactive.filter(element => {
    const rect = element.getBoundingClientRect();
    if (!(rect.left < -1 || rect.right > innerWidth + 1)) return false;
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== document.body) {
      const style = getComputedStyle(ancestor);
      const ancestorRect = ancestor.getBoundingClientRect();
      if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX)
        && ancestorRect.right > 0 && ancestorRect.left < innerWidth) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  }).map(describe).slice(0, 30);
  const smallTargets = interactive.filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width < 40 || rect.height < 40;
  }).map(describe).slice(0, 30);
  const brokenImages = [...document.images].filter(image => image.complete && image.naturalWidth === 0).map(describe).slice(0, 30);
  const h1 = document.querySelector("h1");
  const topbar = document.querySelector(".topbar");
  const contactToggle = document.querySelector("[data-header-contact-toggle]");
  const menuToggle = document.querySelector("#menuBtn");
  const heroTitle = document.querySelector("#top-mobile h1, .pnp-mobile-standard-hero h1");
  const heroTitleLine = heroTitle?.querySelector(".home-mobile-hero-line, .pnp-mobile-hero-line");
  const heroSubtitle = document.querySelector("#top-mobile .hero-subtitle, .pnp-mobile-standard-hero .hero-subtitle");
  const headerStyle = element => {
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      borderTopWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
    };
  };
  return {
    url: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    clippedInteractive,
    smallTargets,
    brokenImages,
    h1: h1 ? describe(h1) : null,
    bodyClasses: document.body.className,
    header: {
      topbar: headerStyle(topbar),
      contactToggle: headerStyle(contactToggle),
      menuToggle: headerStyle(menuToggle),
    },
    heroComposition: heroTitle && heroTitleLine ? {
      titleTop: Math.round(heroTitle.getBoundingClientRect().top),
      titleLeft: Math.round(heroTitle.getBoundingClientRect().left),
      lineFontSize: getComputedStyle(heroTitleLine).fontSize,
      lineFontWeight: getComputedStyle(heroTitleLine).fontWeight,
      lineHeight: getComputedStyle(heroTitleLine).lineHeight,
      subtitleFontSize: heroSubtitle ? getComputedStyle(heroSubtitle).fontSize : null,
      subtitleFontWeight: heroSubtitle ? getComputedStyle(heroSubtitle).fontWeight : null,
      subtitleLetterSpacing: heroSubtitle ? getComputedStyle(heroSubtitle).letterSpacing : null,
    } : null,
  };
})()`);

const captureState = async (client, site, route, viewport, { fullPage = false, interactions = false } = {}) => {
  const label = `${site.name}-${route.name}-${viewport.name}`;
  const errors = [];
  const onException = params => errors.push(params.exceptionDetails?.text || "Runtime exception");
  client.on("Runtime.exceptionThrown", onException);
  await navigate(client, `${site.baseUrl}${route.path}`, viewport);
  const metrics = await collectMetrics(client);
  await screenshot(client, path.join(reportRoot, `${label}.png`));
  if (fullPage) await screenshot(client, path.join(reportRoot, `${label}-full.png`), true);

  const interactionState = {};
  const functionalChecks = {};
  if (interactions) {
    const controls = [
      { name: "menu", selector: "#menuBtn", state: "#mainNav" },
      { name: "contact", selector: "[data-header-contact-toggle]", state: ".header-contact-dropdown" },
      ...(route.name === "catalog" ? [{ name: "catalog-index", selector: "[data-catalog-v2-index-toggle]", state: ".catalog-v2-index-list" }] : []),
      ...(route.name === "vendors" ? [{ name: "vendor-filters", selector: "[data-vendor-mobile-filter-toggle]", state: "[data-vendor-advanced-filters]" }] : []),
    ];
    for (const control of controls) {
      const result = await evaluate(client, `(() => {
        const button = document.querySelector(${JSON.stringify(control.selector)});
        if (!button || getComputedStyle(button).display === "none") return { available: false };
        const rect = button.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) button.scrollIntoView({ block: "center" });
        button.click();
        const state = document.querySelector(${JSON.stringify(control.state)});
        return { available: true, expanded: button.getAttribute("aria-expanded"), hidden: state?.hidden ?? null };
      })()`);
      await delay(120);
      interactionState[control.name] = result;
      if (result.available) {
        await screenshot(client, path.join(reportRoot, `${label}-${control.name}-open.png`));
        await evaluate(client, `document.querySelector(${JSON.stringify(control.selector)})?.click()`);
        interactionState[control.name].closedExpanded = await evaluate(
          client,
          `document.querySelector(${JSON.stringify(control.selector)})?.getAttribute("aria-expanded")`,
        );
      }
    }

    if (route.name === "home") {
      functionalChecks.workflow = await evaluate(client, `(() => {
        const tabs = [...document.querySelectorAll("[data-home-request-step]")];
        if (tabs.length < 2) return { available: false };
        tabs[1].click();
        const result = {
          available: true,
          selected: tabs[1].getAttribute("aria-selected"),
          title: document.querySelector("[data-home-request-title]")?.textContent?.trim() || "",
        };
        tabs[0].click();
        return result;
      })()`);
      const brandTabsAvailable = await evaluate(client, `(() => {
        const tabs = [...document.querySelectorAll("[data-home-brand-filter] [role=tab]")];
        if (tabs.length < 2) return false;
        tabs[1].click();
        return true;
      })()`);
      await delay(1200);
      functionalChecks.brandTabs = await evaluate(client, `(() => {
        const tabs = [...document.querySelectorAll("[data-home-brand-filter] [role=tab]")];
        if (tabs.length < 2) return { available: false };
        const result = { available: ${brandTabsAvailable}, selected: tabs[1].getAttribute("aria-selected") };
        tabs[0].click();
        return result;
      })()`);
      functionalChecks.requestTabs = await evaluate(client, `(() => {
        const switcher = [...document.querySelectorAll("[data-contact-request-switcher]")].find(root => {
          const rect = root.getBoundingClientRect();
          return getComputedStyle(root).display !== "none" && rect.width > 0;
        });
        const cooperation = switcher?.querySelector('[data-contact-request-tab="cooperation"]');
        const supply = switcher?.querySelector('[data-contact-request-tab="supply"]');
        if (!cooperation || !supply) return { available: false };
        cooperation.click();
        const panel = switcher.querySelector('[data-contact-request-panel="cooperation"]');
        const result = { available: true, selected: cooperation.getAttribute("aria-selected"), panelHidden: panel?.hidden ?? true };
        supply.click();
        return result;
      })()`);
    }

    if (route.name === "catalog") {
      await evaluate(client, `(() => {
        const input = document.querySelector("[data-catalog-v2-search]");
        if (!input) return;
        input.value = "Eltex";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      })()`);
      await delay(650);
      functionalChecks.search = await evaluate(client, `(() => {
        const results = document.querySelector("[data-catalog-v2-search-results]");
        const count = results?.querySelectorAll("a, .catalog-v2-search-empty").length || 0;
        const state = { available: Boolean(results), hidden: results?.hidden ?? true, count };
        const input = document.querySelector("[data-catalog-v2-search]");
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return state;
      })()`);
    }

    if (route.name === "vendors") {
      await evaluate(client, `(() => {
        const form = document.querySelector("[data-vendor-filter-form]");
        const input = form?.querySelector('#vendorSearch');
        if (!form || !input) return;
        input.value = "Eltex";
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      })()`);
      await delay(750);
      functionalChecks.search = await evaluate(client, `(() => {
        const rows = document.querySelector("[data-vendor-rows]");
        const state = {
          available: Boolean(rows),
          rowCount: rows?.querySelectorAll(".vendor-row:not(.empty-row)").length || 0,
          countText: document.querySelector("[data-vendor-count]")?.textContent?.trim() || "",
        };
        document.querySelector("[data-vendor-clear]")?.click();
        return state;
      })()`);
      await delay(250);
    }
  }
  return { site: site.name, route: route.name, viewport: viewport.name, metrics, interactions: interactionState, functionalChecks, errors };
};

(async () => {
  fs.mkdirSync(reportRoot, { recursive: true });
  fs.mkdirSync(profileRoot, { recursive: true });
  const edge = spawn(edgeExecutable, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--disable-features=msEdgeFirstRunExperience",
    `--remote-debugging-port=${debuggerPort}`,
    `--user-data-dir=${profileRoot}`,
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const results = [];
  let client;
  try {
    await waitForDebugger();
    const tab = await createTab();
    client = new CdpClient(tab.webSocketDebuggerUrl);
    await client.open();
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Network.enable"),
      client.send("Network.setCacheDisabled", { cacheDisabled: true }),
    ]);

    const pairedViewport = requiredViewports.find(viewport => viewport.name === "390x844");
    for (const site of sites) {
      for (const route of routes) {
        results.push(await captureState(client, site, route, pairedViewport, { fullPage: true, interactions: true }));
      }
    }
    for (const site of sites) {
      for (const viewport of requiredViewports.filter(item => item.name !== "390x844")) {
        const isReviewViewport = viewport.name === "614x1020";
        results.push(await captureState(client, site, routes[0], viewport, {
          fullPage: isReviewViewport,
          interactions: isReviewViewport,
        }));
      }
    }
  } finally {
    client?.close();
    edge.kill();
  }

  const failures = [];
  const pnpHomeMobile = results.find(result => result.site === "pnp" && result.route === "home" && result.viewport === "390x844");
  for (const result of results) {
    const prefix = `${result.site}/${result.route}/${result.viewport}`;
    if (result.metrics.horizontalOverflow) failures.push(`${prefix}: horizontal overflow`);
    if (result.metrics.clippedInteractive.length) failures.push(`${prefix}: clipped interactive controls`);
    if (result.metrics.brokenImages.length) failures.push(`${prefix}: broken images`);
    if (result.errors.length) failures.push(`${prefix}: runtime errors`);
    if (
      result.site === "pnp"
      && result.viewport === "390x844"
      && ["home", "catalog", "vendors", "partners", "contacts"].includes(result.route)
    ) {
      const header = result.metrics.header || {};
      if (header.topbar?.backgroundColor !== "rgba(0, 0, 0, 0)") failures.push(`${prefix}: mobile header is not transparent at page top`);
      if (header.contactToggle?.borderRadius !== "8px") failures.push(`${prefix}: contact control differs from homepage header`);
      if (header.menuToggle?.borderRadius !== "8px") failures.push(`${prefix}: menu control differs from homepage header`);
    }
    if (
      result.site === "pnp"
      && result.viewport === "390x844"
      && ["vendors", "partners", "contacts"].includes(result.route)
      && pnpHomeMobile?.metrics.heroComposition
    ) {
      const reference = pnpHomeMobile.metrics.heroComposition;
      const current = result.metrics.heroComposition;
      if (!current || Math.abs(current.titleTop - reference.titleTop) > 1) failures.push(`${prefix}: hero title vertical position differs from homepage`);
      if (!current || current.titleLeft !== reference.titleLeft) failures.push(`${prefix}: hero title horizontal position differs from homepage`);
      if (!current || current.lineFontSize !== reference.lineFontSize) failures.push(`${prefix}: hero title size differs from homepage`);
      if (!current || current.lineFontWeight !== reference.lineFontWeight) failures.push(`${prefix}: hero title weight differs from homepage`);
      if (!current || current.subtitleFontSize !== reference.subtitleFontSize) failures.push(`${prefix}: hero subtitle size differs from homepage`);
      if (!current || current.subtitleFontWeight !== reference.subtitleFontWeight) failures.push(`${prefix}: hero subtitle weight differs from homepage`);
      if (!current || current.subtitleLetterSpacing !== reference.subtitleLetterSpacing) failures.push(`${prefix}: hero subtitle spacing differs from homepage`);
    }
    for (const [name, state] of Object.entries(result.interactions)) {
      if (state.available && state.expanded !== "true") failures.push(`${prefix}: ${name} did not expose expanded state`);
      if (state.available && state.closedExpanded !== "false") failures.push(`${prefix}: ${name} did not close cleanly`);
    }
    const checks = result.functionalChecks || {};
    if (checks.workflow?.available && (checks.workflow.selected !== "true" || !checks.workflow.title)) failures.push(`${prefix}: workflow tabs failed`);
    if (checks.brandTabs?.available && checks.brandTabs.selected !== "true") failures.push(`${prefix}: brand tabs failed`);
    if (checks.requestTabs?.available && (checks.requestTabs.selected !== "true" || checks.requestTabs.panelHidden)) failures.push(`${prefix}: request tabs failed`);
    if (result.route === "catalog" && checks.search?.available && (checks.search.hidden || checks.search.count < 1)) failures.push(`${prefix}: catalog search failed`);
    if (result.route === "vendors" && checks.search?.available && checks.search.rowCount < 1) failures.push(`${prefix}: vendor search failed`);
  }
  const report = { generatedAt: new Date().toISOString(), sites, routes, requiredViewports, results, failures };
  fs.writeFileSync(path.join(reportRoot, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportRoot, captures: results.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
