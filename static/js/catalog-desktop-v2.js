(() => {
  "use strict";

  const rootElement = document.querySelector("[data-catalog-v2]");
  const dataElement = document.querySelector("#catalogInteractiveData");
  if (!rootElement || !dataElement) return;

  let catalogData = null;
  try {
    catalogData = JSON.parse(dataElement.textContent || "null");
  } catch {
    catalogData = null;
  }

  if (!catalogData?.root || !catalogData?.nodes) return;

  const nodes = catalogData.nodes;
  const catalogRoot = catalogData.root;
  const blockIds = (catalogRoot.children || []).filter(id => nodes[id]?.kind === "block");
  if (!blockIds.length) return;

  const indexList = rootElement.querySelector("[data-catalog-v2-index]");
  const blockGrid = rootElement.querySelector("[data-catalog-v2-blocks]");
  const content = rootElement.querySelector("[data-catalog-v2-content]");
  const contentTitle = rootElement.querySelector("[data-catalog-v2-title]");
  const contentKicker = rootElement.querySelector("[data-catalog-v2-kicker]");
  const breadcrumbs = rootElement.querySelector("[data-catalog-v2-breadcrumbs]");
  const backButton = rootElement.querySelector("[data-catalog-v2-back]");
  const searchBox = rootElement.querySelector("[data-catalog-v2-search-box]");
  const searchButton = rootElement.querySelector("[data-catalog-v2-search-button]");
  const searchInput = rootElement.querySelector("[data-catalog-v2-search]");
  const searchResults = rootElement.querySelector("[data-catalog-v2-search-results]");
  const searchDataElement = document.querySelector("#catalogSearchData");

  const parentById = new Map();
  Object.values(nodes).forEach(node => {
    (node.children || []).forEach(childId => parentById.set(childId, node.id));
  });
  blockIds.forEach(blockId => parentById.set(blockId, "root"));

  const pathToId = new Map();
  Object.values(nodes).forEach(node => {
    if (!node.url) return;
    try {
      pathToId.set(new URL(node.url, window.location.origin).pathname, node.id);
    } catch {
      // A malformed optional URL must not prevent the catalog from rendering.
    }
  });

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const nodeById = id => (id === "root" ? catalogRoot : nodes[id]);
  const imageFor = node => node?.image || nodes[state.activeBlockId]?.image || "";
  const urlFor = node => node?.url || "/catalog/";
  const storageKey = "pnp_catalog_request_items";

  const state = {
    activeBlockId: blockIds[0],
    currentTarget: blockIds[0],
    expandedIds: new Set(),
  };

  const ancestorBlockId = target => {
    let current = target;
    while (current && current !== "root") {
      if (nodes[current]?.kind === "block") return current;
      current = parentById.get(current);
    }
    return blockIds[0];
  };

  const childIdsFor = target => (nodeById(target)?.children || []).filter(id => nodes[id]);
  const levelLabelFor = node => node?.kind === "block" ? "Сфера поставки" : node?.level || "";

  const pathIdsFor = target => {
    const path = [];
    let current = target;
    while (current && current !== "root") {
      if (nodes[current]) path.push(current);
      current = parentById.get(current);
    }
    return path.reverse();
  };

  const syncExpandedPath = target => {
    state.expandedIds.clear();
    pathIdsFor(target).forEach(id => {
      if (childIdsFor(id).length) state.expandedIds.add(id);
    });
  };

  const collapseTreeBranch = target => {
    state.expandedIds.delete(target);
    childIdsFor(target).forEach(collapseTreeBranch);
  };

  const expandTreeBranch = target => {
    const parentId = parentById.get(target);
    const siblingIds = parentId === "root" ? blockIds : childIdsFor(parentId);
    siblingIds.forEach(siblingId => {
      if (siblingId !== target) collapseTreeBranch(siblingId);
    });
    pathIdsFor(target).forEach(id => {
      if (childIdsFor(id).length) state.expandedIds.add(id);
    });
  };

  const treeNodeHtml = id => {
    const node = nodes[id];
    if (!node) return "";
    const childIds = childIdsFor(id);
    const hasChildren = childIds.length > 0;
    const expanded = hasChildren && state.expandedIds.has(id);
    const selected = state.currentTarget === id;
    const inPath = pathIdsFor(state.currentTarget).includes(id);
    const itemClasses = [
      "catalog-v2-tree-item",
      selected ? "is-selected" : "",
      inPath ? "is-path" : "",
      expanded ? "is-expanded" : "",
    ].filter(Boolean).join(" ");
    const toggle = hasChildren
      ? `<button class="catalog-v2-tree-toggle" type="button" data-catalog-v2-toggle="${escapeHtml(id)}" aria-expanded="${String(expanded)}" aria-label="${expanded ? "Свернуть" : "Развернуть"}: ${escapeHtml(node.title)}"><span class="catalog-v2-tree-toggle-icon" aria-hidden="true"></span></button>`
      : '<span class="catalog-v2-tree-marker" aria-hidden="true"></span>';
    const children = expanded
      ? `<ul class="catalog-v2-tree-children" role="group">${childIds.map(treeNodeHtml).join("")}</ul>`
      : "";

    return `
      <li class="${itemClasses}" role="treeitem"${hasChildren ? ` aria-expanded="${String(expanded)}"` : ""}>
        <div class="catalog-v2-tree-row">
          ${toggle}
          <a class="catalog-v2-tree-link" href="${escapeHtml(urlFor(node))}" data-catalog-v2-target="${escapeHtml(id)}"${selected ? ' aria-current="page"' : ""}>
            <span class="catalog-v2-tree-label">${escapeHtml(node.title)}</span>
            <small>${escapeHtml(levelLabelFor(node))}</small>
          </a>
        </div>
        ${children}
      </li>`;
  };

  const renderIndex = () => {
    if (!indexList) return;
    indexList.innerHTML = blockIds.map(treeNodeHtml).join("");
  };

  const renderBlockCards = () => {
    if (!blockGrid) return;
    blockGrid.innerHTML = blockIds.map((id, index) => {
      const block = nodes[id];
      return `
        <a class="catalog-v2-block-card" href="${escapeHtml(urlFor(block))}" data-catalog-v2-target="${escapeHtml(id)}">
          <img src="${escapeHtml(imageFor(block))}" alt="" loading="${index === 0 ? "eager" : "lazy"}">
          <span class="catalog-v2-block-overlay">
            <h2>${escapeHtml(block.title)}</h2>
            <span class="catalog-v2-card-arrow" aria-hidden="true">›</span>
          </span>
        </a>`;
    }).join("");
  };

  const syncBlockState = () => {
    rootElement.querySelectorAll(".catalog-v2-block-card[data-catalog-v2-target]").forEach(card => {
      const active = card.dataset.catalogV2Target === state.activeBlockId;
      card.classList.toggle("is-active", active);
      if (active) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });
  };

  const cardHtml = node => `
    <a class="catalog-v2-system-card" href="${escapeHtml(urlFor(node))}" data-catalog-v2-target="${escapeHtml(node.id)}">
      <img src="${escapeHtml(imageFor(node))}" alt="" loading="lazy">
      <span class="catalog-v2-system-overlay">
        <h3>${escapeHtml(node.title)}</h3>
        <span class="catalog-v2-card-arrow" aria-hidden="true">›</span>
      </span>
    </a>`;

  const setGridContent = ids => {
    if (!content) return;
    content.className = "catalog-v2-system-grid";
    content.dataset.catalogV2Count = String(ids.length);
    content.dataset.catalogV2Kind = nodes[ids[0]]?.kind || "empty";
    const cards = ids
      .map(id => nodes[id])
      .filter(Boolean)
      .map(cardHtml)
      .join("");
    content.innerHTML = cards || '<div class="catalog-v2-empty">На этом уровне пока нет опубликованных позиций.</div>';
  };

  const setHeading = ({ title, kicker = "", backTarget = "" }) => {
    if (contentTitle) contentTitle.textContent = title;
    if (contentKicker) {
      contentKicker.textContent = kicker;
      contentKicker.hidden = !kicker;
    }
    if (backButton) {
      backButton.dataset.catalogV2Back = backTarget;
      backButton.hidden = !backTarget;
    }
  };

  const renderBreadcrumbs = node => {
    if (!breadcrumbs || !node || node.kind === "block") {
      if (breadcrumbs) {
        breadcrumbs.innerHTML = "";
        breadcrumbs.hidden = true;
      }
      return;
    }

    const rows = (node.breadcrumbs || [])
      .filter(row => row.target && row.target !== "root" && row.target !== node.id);
    if (!rows.length) {
      breadcrumbs.innerHTML = "";
      breadcrumbs.hidden = true;
      return;
    }

    breadcrumbs.innerHTML = rows.map(row => `
      <button class="catalog-v2-breadcrumb" type="button" data-catalog-v2-breadcrumb="${escapeHtml(row.target)}">${escapeHtml(row.title)}</button>`).join("");
    breadcrumbs.hidden = false;
  };

  const renderBlockOverview = blockId => {
    const block = nodes[blockId];
    if (!block || block.kind !== "block") return;
    state.activeBlockId = blockId;
    state.currentTarget = blockId;
    syncExpandedPath(blockId);
    renderIndex();
    setHeading({ title: "Направления", kicker: block.title });
    renderBreadcrumbs(block);
    setGridContent(childIdsFor(blockId));
    syncBlockState();
  };

  const vendorFilterUrl = vendor => {
    if (vendor?.slug) return `/vendors/?vendors=${encodeURIComponent(vendor.slug)}#allManufacturers`;
    return `/vendors/?q=${encodeURIComponent(vendor?.name || "")}#allManufacturers`;
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
        list.textContent = "Выберите тип продукции — здесь появится структура заявки из каталога.";
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
    const types = (group.types || []).length ? group.types : [{ title: group.title }];
    const typeRows = types.map(type => {
      const value = `${group.systemTitle || "Позиции каталога"}|${group.title}|${type.title}`;
      return `
        <button class="catalog-v2-type-row" type="button" data-request-item="${escapeHtml(value)}" aria-pressed="false">
          <span><b>${escapeHtml(type.title)}</b><small>Добавить этот тип в заявку</small></span>
          <i aria-hidden="true">+</i>
        </button>`;
    }).join("");
    const vendors = (group.vendors || []).map(vendor => `
      <a class="logo-tile" href="${escapeHtml(vendorFilterUrl(vendor))}" title="${escapeHtml(vendor.name)}">
        ${vendor.logo ? `<img src="${escapeHtml(vendor.logo)}" alt="${escapeHtml(vendor.name)}" loading="lazy">` : `<span>${escapeHtml(vendor.name)}</span>`}
      </a>`).join("");

    content.className = "catalog-v2-product";
    content.innerHTML = `
      <article class="catalog-v2-product-hero">
        <img src="${escapeHtml(imageFor(group))}" alt="" loading="lazy">
        <div class="catalog-v2-product-hero-copy">
          <span>Товарная группа</span>
          <h2>${escapeHtml(group.title)}</h2>
          <p>${escapeHtml(group.summary || "Помогаем подобрать исполнение, аналоги и производителей под требования проекта.")}</p>
        </div>
      </article>
      <article class="catalog-v2-passport">
        <div class="catalog-v2-passport-grid">
          <section class="catalog-v2-passport-panel">
            <h3>Типы продукции</h3>
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
          <div><span class="soft-label">Мини-заявка <b data-request-count>0</b></span><h3>Выбранные позиции</h3></div>
          <button class="btn ghost small" type="button" data-request-clear>Очистить</button>
        </div>
        <div class="mini-request-selected-list" data-request-list>Выберите тип продукции — здесь появится структура заявки из каталога.</div>
        <div class="mini-request-actions"><a class="btn light" href="/contacts/#request-form">Перейти к заявке</a></div>
      </section>`;
    syncRequestUi();
  };

  const renderTarget = target => {
    const node = nodeById(target);
    if (!node) return;
    if (node.kind === "block") {
      renderBlockOverview(node.id);
      return;
    }

    state.activeBlockId = ancestorBlockId(node.id);
    state.currentTarget = node.id;
    syncExpandedPath(node.id);
    renderIndex();
    syncBlockState();
    renderBreadcrumbs(node);
    const parentTarget = parentById.get(node.id) || state.activeBlockId;

    if (node.kind === "group") {
      setHeading({ title: "Подбор по товарной группе", kicker: node.title, backTarget: parentTarget });
      renderProduct(node);
    } else {
      const childIds = childIdsFor(node.id);
      const title = node.kind === "direction" ? "Системы" : "Товарные группы";
      setHeading({ title, kicker: node.title, backTarget: parentTarget });
      setGridContent(childIds);
    }

  };

  const selectFromCurrentPath = () => {
    const target = pathToId.get(window.location.pathname);
    if (!target || !nodes[target]) {
      renderBlockOverview(blockIds[0]);
      return;
    }
    renderTarget(target);
  };

  let searchItems = [];
  try {
    searchItems = searchDataElement ? JSON.parse(searchDataElement.textContent || "[]") : [];
  } catch {
    searchItems = [];
  }

  const normalize = value =>
    String(value || "")
      .toLowerCase()
      .replaceAll("ё", "е")
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const escapeRegExp = value => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokenize = value => normalize(value).split(" ").filter(Boolean);

  const scoreSearchItem = (item, query) => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return 0;
    const title = normalize(item.title);
    const path = normalize(item.path);
    const aliases = (item.aliases || []).map(normalize).filter(Boolean);
    const haystack = [title, path, ...aliases].join(" ");
    const words = tokenize(title);
    const acronym = String(query || "").trim().toUpperCase();
    const atStart = acronym ? new RegExp(`^${escapeRegExp(acronym)}([^\\p{L}\\p{N}]|$)`, "u").test(String(item.title || "")) : false;
    const asWord = acronym ? new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(acronym)}([^\\p{L}\\p{N}]|$)`, "u").test(String(item.title || "")) : false;
    if (title === normalizedQuery) return 140;
    if (normalizedQuery.length <= 2) {
      if (atStart) return 132;
      if (asWord) return 124;
      if (aliases.includes(normalizedQuery)) return 112;
      return 0;
    }
    if (title.startsWith(normalizedQuery)) return 132;
    if (words.includes(normalizedQuery)) return 124;
    if (aliases.includes(normalizedQuery)) return 112;
    if (haystack.includes(normalizedQuery)) return 42;
    const queryWords = tokenize(normalizedQuery);
    return queryWords.length && queryWords.every(word => haystack.includes(word)) ? 30 : 0;
  };

  const renderSearchResults = () => {
    if (!searchInput || !searchResults) return;
    const query = searchInput.value.trim();
    searchResults.innerHTML = "";
    if (!query) {
      searchResults.hidden = true;
      return;
    }
    const matches = searchItems
      .map(item => ({ ...item, score: scoreSearchItem(item, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title), "ru"))
      .slice(0, 10);
    if (!matches.length) {
      searchResults.innerHTML = '<p class="catalog-v2-search-empty">Ничего не найдено. Попробуйте название материала, системы или производителя.</p>';
      searchResults.hidden = false;
      return;
    }
    searchResults.innerHTML = matches.map(item => `
      <a class="catalog-v2-search-result" href="${escapeHtml(item.url || "/catalog/")}" data-catalog-v2-target="${escapeHtml(item.target || "")}">
        <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.level)}</span><small>${escapeHtml(item.path || "")}</small>
      </a>`).join("");
    searchResults.hidden = false;
  };

  rootElement.addEventListener("click", event => {
    const treeToggle = event.target.closest("[data-catalog-v2-toggle]");
    if (treeToggle) {
      event.preventDefault();
      const target = treeToggle.dataset.catalogV2Toggle;
      if (state.expandedIds.has(target)) collapseTreeBranch(target);
      else expandTreeBranch(target);
      renderIndex();
      return;
    }

    const breadcrumb = event.target.closest("[data-catalog-v2-breadcrumb]");
    if (breadcrumb) {
      event.preventDefault();
      renderTarget(breadcrumb.dataset.catalogV2Breadcrumb);
      return;
    }

    const targetLink = event.target.closest("a[data-catalog-v2-target]");
    if (!targetLink) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = targetLink.dataset.catalogV2Target;
    if (!nodeById(target)) return;
    event.preventDefault();
    if (searchResults) searchResults.hidden = true;
    renderTarget(target);
  });

  backButton?.addEventListener("click", () => {
    const target = backButton.dataset.catalogV2Back;
    if (target) renderTarget(target);
  });

  searchButton?.addEventListener("click", () => searchInput?.focus());
  searchInput?.addEventListener("input", renderSearchResults);
  searchInput?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      searchResults.hidden = true;
      searchInput.blur();
      return;
    }
    if (event.key !== "Enter") return;
    const first = searchResults?.querySelector("a[data-catalog-v2-target]");
    if (!first) return;
    event.preventDefault();
    first.click();
  });

  document.addEventListener("click", event => {
    if (!searchBox?.contains(event.target) && searchResults) searchResults.hidden = true;
  });
  document.addEventListener("pnp:request-items-changed", syncRequestUi);

  renderIndex();
  renderBlockCards();
  selectFromCurrentPath();
})();
