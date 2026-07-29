(() => {
  "use strict";

  const rootElement = document.querySelector("[data-catalog-v2]");
  const dataElement = document.querySelector("#catalogInitialData");
  if (!rootElement || !dataElement) return;

  let initialData = null;
  try {
    initialData = JSON.parse(dataElement.textContent || "null");
  } catch {
    initialData = null;
  }
  if (!initialData?.root?.node) return;

  const nodes = new Map();
  const loadedTargets = new Set();
  const expandedTargets = new Set();
  const pendingTargets = new Map();
  const rootTarget = "root";
  const storageKey = "pnp_catalog_request_items";

  const indexList = rootElement.querySelector("[data-catalog-v2-index]");
  const indexToggle = rootElement.querySelector("[data-catalog-v2-index-toggle]");
  const blockSection = rootElement.querySelector("[data-catalog-v2-block-section]");
  const blockGrid = rootElement.querySelector("[data-catalog-v2-blocks]");
  const contentSection = rootElement.querySelector("[data-catalog-v2-content-section]");
  const content = rootElement.querySelector("[data-catalog-v2-content]");
  const contentTitle = rootElement.querySelector("[data-catalog-v2-title]");
  const contentKicker = rootElement.querySelector("[data-catalog-v2-kicker]");
  const breadcrumbs = rootElement.querySelector("[data-catalog-v2-breadcrumbs]");
  const backButton = rootElement.querySelector("[data-catalog-v2-back]");
  const status = rootElement.querySelector("[data-catalog-v2-status]");
  const searchBox = rootElement.querySelector("[data-catalog-v2-search-box]");
  const searchButton = rootElement.querySelector("[data-catalog-v2-search-button]");
  const searchInput = rootElement.querySelector("[data-catalog-v2-search]");
  const searchResults = rootElement.querySelector("[data-catalog-v2-search-results]");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const mergeNode = incoming => {
    if (!incoming?.id) return;
    const existing = nodes.get(incoming.id) || {};
    const children = Array.from(new Set([...(existing.children || []), ...(incoming.children || [])]));
    nodes.set(incoming.id, { ...existing, ...incoming, children });
  };

  const mergePayload = payload => {
    if (!payload?.node) return;
    (payload.ancestors || []).forEach(mergeNode);
    mergeNode(payload.node);
    (payload.children || []).forEach(mergeNode);
    loadedTargets.add(payload.node.id);
  };

  mergePayload(initialData.root);
  if (initialData.initial) mergePayload(initialData.initial);

  const nodeById = target => nodes.get(target);
  const rootNode = nodeById(rootTarget);
  const blockTargets = () => (rootNode?.children || []).filter(target => nodeById(target)?.kind === "block");
  const childTargets = target => (nodeById(target)?.children || []).filter(child => nodes.has(child));
  const imageFor = node => node?.image || "/static/assets/img/catalog/empty-photo-placeholder.svg";
  const urlFor = node => node?.url || "/catalog/";

  const state = {
    currentTarget: initialData.initialTarget || rootTarget,
    activeBlockTarget: blockTargets()[0] || "",
    searchController: null,
    searchTimer: null,
  };

  const setStatus = (message = "", isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.hidden = !message;
  };

  const ensureNode = async target => {
    if (loadedTargets.has(target)) return nodeById(target);
    if (pendingTargets.has(target)) return pendingTargets.get(target);

    const pending = (async () => {
      setStatus("Загружаем раздел…");
      const url = new URL(initialData.nodeEndpoint, window.location.origin);
      url.searchParams.set("id", target);
      const response = await fetch(url, {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!response.ok) throw new Error("Не удалось загрузить раздел каталога.");
      const payload = await response.json();
      mergePayload(payload);
      setStatus();
      return nodeById(target);
    })().finally(() => pendingTargets.delete(target));

    pendingTargets.set(target, pending);
    return pending;
  };

  const pathTargets = target => {
    const path = [];
    const visited = new Set();
    let current = target;
    while (current && current !== rootTarget && !visited.has(current)) {
      visited.add(current);
      if (nodeById(current)) path.push(current);
      current = nodeById(current)?.parent;
    }
    return path.reverse();
  };

  const activeBlockFor = target => pathTargets(target).find(id => nodeById(id)?.kind === "block") || blockTargets()[0] || "";

  const collapseBranch = target => {
    expandedTargets.delete(target);
    childTargets(target).forEach(collapseBranch);
  };

  const expandPath = target => {
    pathTargets(target).forEach(id => {
      if (nodeById(id)?.hasChildren) expandedTargets.add(id);
    });
  };

  const treeNodeHtml = target => {
    const node = nodeById(target);
    if (!node) return "";
    const children = childTargets(target);
    const expanded = expandedTargets.has(target);
    const selected = state.currentTarget === target;
    const inPath = pathTargets(state.currentTarget).includes(target);
    const classes = [
      "catalog-v2-tree-item",
      selected ? "is-selected" : "",
      inPath ? "is-path" : "",
      expanded ? "is-expanded" : "",
    ].filter(Boolean).join(" ");
    const toggle = node.hasChildren
      ? `<button class="catalog-v2-tree-toggle" type="button" data-catalog-v2-toggle="${escapeHtml(target)}" aria-expanded="${String(expanded)}" aria-label="${expanded ? "Свернуть" : "Развернуть"}: ${escapeHtml(node.title)}"><span class="catalog-v2-tree-toggle-icon" aria-hidden="true"></span></button>`
      : '<span class="catalog-v2-tree-marker" aria-hidden="true"></span>';
    const nested = expanded && children.length
      ? `<ul class="catalog-v2-tree-children" role="group">${children.map(treeNodeHtml).join("")}</ul>`
      : "";

    return `
      <li class="${classes}" role="treeitem"${node.hasChildren ? ` aria-expanded="${String(expanded)}"` : ""}>
        <div class="catalog-v2-tree-row">
          ${toggle}
          <a class="catalog-v2-tree-link" href="${escapeHtml(urlFor(node))}" data-catalog-v2-target="${escapeHtml(target)}"${selected ? ' aria-current="page"' : ""}>
            <span class="catalog-v2-tree-label">${escapeHtml(node.title)}</span>
            <small>${escapeHtml(node.level || "")}</small>
          </a>
        </div>
        ${nested}
      </li>`;
  };

  const renderIndex = () => {
    if (!indexList) return;
    indexList.innerHTML = blockTargets().map(treeNodeHtml).join("");
  };

  const renderBlockCards = () => {
    if (!blockGrid) return;
    blockGrid.innerHTML = blockTargets().map((target, index) => {
      const block = nodeById(target);
      const active = state.activeBlockTarget === target && state.currentTarget !== rootTarget;
      return `
        <a class="catalog-v2-block-card${active ? " is-active" : ""}" href="${escapeHtml(urlFor(block))}" data-catalog-v2-target="${escapeHtml(target)}"${active ? ' aria-current="true"' : ""}>
          <img src="${escapeHtml(imageFor(block))}" alt="" loading="${index === 0 ? "eager" : "lazy"}">
          <span class="catalog-v2-block-overlay">
            <h2>${escapeHtml(block.title)}</h2>
            <span class="catalog-v2-card-arrow" aria-hidden="true">›</span>
          </span>
        </a>`;
    }).join("");
  };

  const cardHtml = node => `
    <a class="catalog-v2-system-card" href="${escapeHtml(urlFor(node))}" data-catalog-v2-target="${escapeHtml(node.id)}">
      <img src="${escapeHtml(imageFor(node))}" alt="" loading="lazy">
      <span class="catalog-v2-system-overlay">
        <span>${escapeHtml(node.level || "")}</span>
        <h3>${escapeHtml(node.title)}</h3>
        <span class="catalog-v2-card-arrow" aria-hidden="true">›</span>
      </span>
    </a>`;

  const renderCards = children => {
    if (!content) return;
    content.className = "catalog-v2-system-grid";
    content.dataset.catalogV2Count = String(children.length);
    content.dataset.catalogV2Kind = children[0]?.kind || "empty";
    content.innerHTML = children.map(cardHtml).join("") || '<div class="catalog-v2-empty">В этом разделе пока нет опубликованных позиций.</div>';
  };

  const readRequestItems = () => {
    try {
      const items = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(items) ? items.filter(Boolean) : [];
    } catch {
      return [];
    }
  };

  const requestItemParts = item => {
    const [system = "", group = "", type = ""] = String(item || "").split("|").map(part => part.trim());
    return { system, group, type };
  };

  const groupedRequestItems = items => {
    const grouped = new Map();
    items.forEach(item => {
      const parts = requestItemParts(item);
      const key = parts.system || "Позиции каталога";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ raw: item, ...parts });
    });
    return grouped;
  };

  const requestText = items => {
    if (!items.length) return "";
    const lines = ["Заявка из каталога:"];
    groupedRequestItems(items).forEach((rows, system) => {
      lines.push(`${system}:`);
      rows.forEach(row => {
        const title = row.type && row.type !== row.group ? `${row.group} — ${row.type}` : row.group || row.type;
        lines.push(`- ${title}`);
      });
    });
    return lines.join("\n");
  };

  const syncRequestUi = () => {
    const items = readRequestItems();
    rootElement.querySelectorAll("[data-request-count]").forEach(counter => {
      counter.textContent = String(items.length);
    });
    rootElement.querySelectorAll("[data-request-items]").forEach(field => {
      field.value = JSON.stringify(items);
    });
    rootElement.querySelectorAll("[data-request-output]").forEach(field => {
      field.value = requestText(items);
    });
    rootElement.querySelectorAll("[data-request-item]").forEach(button => {
      const selected = items.includes(button.dataset.requestItem);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      const icon = button.querySelector("i");
      if (icon) icon.textContent = selected ? "−" : "+";
    });
    rootElement.querySelectorAll("[data-request-list]").forEach(list => {
      if (!items.length) {
        list.textContent = "Выбранные позиции появятся здесь.";
        return;
      }
      list.innerHTML = Array.from(groupedRequestItems(items), ([system, rows]) => `
        <section>
          <b>${escapeHtml(system)}</b>
          ${rows.map(row => {
            const title = row.type && row.type !== row.group ? `${row.group} — ${row.type}` : row.group || row.type;
            return `<span><em>${escapeHtml(title)}</em><button type="button" class="request-item-remove" data-request-remove="${escapeHtml(row.raw)}" aria-label="Убрать позицию из заявки">−</button></span>`;
          }).join("")}
        </section>`).join("");
    });
  };

  const renderProduct = group => {
    if (!content) return;
    delete content.dataset.catalogV2Count;
    delete content.dataset.catalogV2Kind;
    const types = group.types?.length ? group.types : [{ title: group.title }];
    const typeRows = types.map(type => {
      const value = `${group.systemTitle || "Позиции каталога"}|${group.title}|${type.title}`;
      return `
        <button class="catalog-v2-type-row" type="button" data-request-item="${escapeHtml(value)}" aria-pressed="false">
          <span><b>${escapeHtml(type.title)}</b><small>Добавить в заявку</small></span>
          <i aria-hidden="true">+</i>
        </button>`;
    }).join("");
    const vendors = (group.vendors || []).map(vendor => `
      <a class="logo-tile" href="${escapeHtml(vendor.url || `/vendors/?vendors=${encodeURIComponent(vendor.slug || "")}`)}" title="${escapeHtml(vendor.name)}">
        ${vendor.logo ? `<img src="${escapeHtml(vendor.logo)}" alt="${escapeHtml(vendor.name)}" loading="lazy">` : `<span>${escapeHtml(vendor.name)}</span>`}
      </a>`).join("");

    content.className = "catalog-v2-product";
    content.innerHTML = `
      <article class="catalog-v2-product-hero">
        <img src="${escapeHtml(imageFor(group))}" alt="" loading="lazy">
        <div class="catalog-v2-product-hero-copy">
          <span>Товарная группа</span>
          <h2>${escapeHtml(group.title)}</h2>
          <p>${escapeHtml(group.summary || "Подберём исполнение, аналоги и производителей под требования проекта.")}</p>
        </div>
      </article>
      <article class="catalog-v2-passport">
        <div class="catalog-v2-passport-grid">
          <section class="catalog-v2-passport-panel">
            <h3>Типы продукции</h3>
            <p class="catalog-v2-request-note">Выбранные позиции уходят в заявку</p>
            <div class="catalog-v2-type-list">${typeRows}</div>
          </section>
          <section class="catalog-v2-passport-panel">
            <h3>Бренды / производители</h3>
            <div class="catalog-v2-vendor-grid">${vendors || '<p class="catalog-v2-vendor-empty">Производители уточняются коммерческим отделом.</p>'}</div>
          </section>
        </div>
      </article>
      <section class="glass catalog-mini-request catalog-mini-request-compact" data-catalog-request-panel>
        <input type="hidden" name="items" data-request-items>
        <textarea class="mini-request-raw" name="request_text" data-request-output aria-label="Комментарий к заявке"></textarea>
        <div class="mini-request-head">
          <div><span class="soft-label">Заявка <b data-request-count>0</b></span><h3>Выбранные позиции</h3></div>
          <button class="btn ghost small" type="button" data-request-clear>Очистить</button>
        </div>
        <div class="mini-request-selected-list" data-request-list>Выбранные позиции появятся здесь.</div>
        <div class="mini-request-actions"><a class="btn light" href="/contacts/#request-form">Перейти к заявке</a></div>
      </section>`;
    syncRequestUi();
  };

  const renderBreadcrumbs = node => {
    if (!breadcrumbs) return;
    const rows = (node?.breadcrumbs || []).filter(row => row.target !== node.id);
    breadcrumbs.innerHTML = rows.map(row => `
      <a class="catalog-v2-breadcrumb" href="${escapeHtml(row.url || "/catalog/")}" data-catalog-v2-target="${escapeHtml(row.target)}">${escapeHtml(row.title)}</a>`).join("");
    breadcrumbs.hidden = !rows.length;
  };

  const headingFor = node => {
    if (node.kind === "block") return "Направления";
    if (node.kind === "direction") return "Системы";
    if (node.kind === "system") return "Товарные группы";
    return "Подбор по товарной группе";
  };

  const updateHistory = (node, mode) => {
    if (!node?.url || mode === "none") return;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath === node.url && mode !== "replace") return;
    const method = mode === "replace" ? "replaceState" : "pushState";
    history[method]({ catalogTarget: node.id }, "", node.url);
  };

  const renderTarget = async (target, { historyMode = "push" } = {}) => {
    try {
      const node = await ensureNode(target);
      if (!node) return;
      state.currentTarget = target;
      state.activeBlockTarget = activeBlockFor(target);
      expandPath(target);
      renderIndex();
      renderBlockCards();

      if (target === rootTarget) {
        if (blockSection) blockSection.hidden = false;
        if (contentSection) contentSection.hidden = true;
        updateHistory(node, historyMode);
        return;
      }

      if (contentSection) contentSection.hidden = false;
      if (contentTitle) contentTitle.textContent = headingFor(node);
      if (contentKicker) {
        contentKicker.textContent = node.title;
        contentKicker.hidden = false;
      }
      if (backButton) {
        backButton.dataset.catalogV2Back = node.parent || rootTarget;
        backButton.hidden = false;
      }
      renderBreadcrumbs(node);

      if (node.kind === "group") renderProduct(node);
      else renderCards(childTargets(target).map(nodeById).filter(Boolean));

      updateHistory(node, historyMode);
      setStatus();
      contentSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(error.message || "Не удалось загрузить каталог.", true);
    }
  };

  const renderSearchResults = groups => {
    if (!searchResults) return;
    const items = (groups || []).flatMap(group => group.items || []).slice(0, 12);
    if (!items.length) {
      searchResults.innerHTML = '<p class="catalog-v2-search-empty">Ничего не найдено.</p>';
      searchResults.hidden = false;
      return;
    }
    searchResults.innerHTML = items.map(item => {
      const target = item.target ? ` data-catalog-v2-target="${escapeHtml(item.target)}"` : "";
      return `
        <a class="catalog-v2-search-result" href="${escapeHtml(item.url || "/catalog/")}"${target}>
          <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.kind || "")}</span><small>${escapeHtml(item.path || "")}</small>
        </a>`;
    }).join("");
    searchResults.hidden = false;
  };

  const requestSearch = async () => {
    const query = searchInput?.value.trim() || "";
    if (query.length < 2) {
      if (searchResults) searchResults.hidden = true;
      return;
    }
    state.searchController?.abort();
    state.searchController = new AbortController();
    const url = new URL(initialData.searchEndpoint, window.location.origin);
    url.searchParams.set("q", query);
    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        signal: state.searchController.signal,
      });
      if (!response.ok) throw new Error("Не удалось выполнить поиск.");
      const payload = await response.json();
      renderSearchResults(payload.groups);
    } catch (error) {
      if (error.name !== "AbortError" && searchResults) {
        searchResults.innerHTML = '<p class="catalog-v2-search-empty">Поиск временно недоступен.</p>';
        searchResults.hidden = false;
      }
    }
  };

  rootElement.addEventListener("click", async event => {
    const treeToggle = event.target.closest("[data-catalog-v2-toggle]");
    if (treeToggle) {
      event.preventDefault();
      const target = treeToggle.dataset.catalogV2Toggle;
      if (expandedTargets.has(target)) {
        collapseBranch(target);
        renderIndex();
      } else {
        try {
          await ensureNode(target);
          expandedTargets.add(target);
          renderIndex();
        } catch (error) {
          setStatus(error.message, true);
        }
      }
      return;
    }

    const link = event.target.closest("a[data-catalog-v2-target]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (searchResults) searchResults.hidden = true;
    await renderTarget(link.dataset.catalogV2Target);
  });

  backButton?.addEventListener("click", () => {
    const target = backButton.dataset.catalogV2Back || rootTarget;
    renderTarget(target);
  });

  indexToggle?.addEventListener("click", () => {
    const open = rootElement.classList.toggle("is-index-open");
    indexToggle.setAttribute("aria-expanded", String(open));
  });

  searchButton?.addEventListener("click", () => searchInput?.focus());
  searchInput?.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(requestSearch, 260);
  });
  searchInput?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (searchResults) searchResults.hidden = true;
      searchInput.blur();
      return;
    }
    if (event.key !== "Enter") return;
    const first = searchResults?.querySelector("a");
    if (!first) return;
    event.preventDefault();
    first.click();
  });

  document.addEventListener("click", event => {
    if (!searchBox?.contains(event.target) && searchResults) searchResults.hidden = true;
  });
  document.addEventListener("pnp:request-items-changed", syncRequestUi);
  window.addEventListener("popstate", event => {
    const target = event.state?.catalogTarget || rootTarget;
    renderTarget(target, { historyMode: "none" });
  });

  renderIndex();
  renderBlockCards();
  renderTarget(state.currentTarget, { historyMode: "replace" });
})();
