document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector("#menuBtn");
  const mainNav = document.querySelector("#mainNav");
  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => mainNav.classList.toggle("open"));
  }

  const contactMenu = document.querySelector("[data-header-contact]");
  const contactToggle = document.querySelector("[data-header-contact-toggle]");
  if (contactMenu && contactToggle) {
    contactToggle.addEventListener("click", event => {
      event.stopPropagation();
      const isOpen = contactMenu.classList.toggle("is-open");
      contactToggle.setAttribute("aria-expanded", String(isOpen));
    });
    document.addEventListener("click", event => {
      if (contactMenu.contains(event.target)) return;
      contactMenu.classList.remove("is-open");
      contactToggle.setAttribute("aria-expanded", "false");
    });
  }

  const storageKey = "pnp_catalog_request_items";

  const readItems = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  };

  const writeItems = items => {
    const normalized = Array.from(new Set((items || []).filter(Boolean)));
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    document.dispatchEvent(new CustomEvent("pnp:request-items-changed", {
      detail: { items: normalized },
    }));
  };

  const requestItemParts = item => {
    const [system = "", group = "", type = ""] = String(item || "")
      .split("|")
      .map(part => part.trim());
    return { system, group, type };
  };

  const groupedRequestItems = items => {
    const groups = new Map();
    items.forEach(item => {
      const { system, group, type } = requestItemParts(item);
      const key = system || "Позиции каталога";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ raw: item, group, type });
    });
    return groups;
  };

  const formatRequestItems = items => {
    if (!items.length) return "";
    const lines = ["Заявка из каталога:"];
    for (const [system, rows] of groupedRequestItems(items)) {
      lines.push(`${system}:`);
      rows.forEach(row => {
        const title = row.type && row.type !== row.group
          ? `${row.group} — ${row.type}`
          : row.group || row.type;
        lines.push(`- ${title}`);
      });
    }
    return lines.join("\n");
  };

  const renderRequestList = (list, items) => {
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      list.textContent = "Выберите тип продукции — здесь появится структура заявки из каталога.";
      return;
    }

    for (const [system, rows] of groupedRequestItems(items)) {
      const section = document.createElement("section");
      const title = document.createElement("b");
      title.textContent = system;
      section.append(title);
      rows.forEach(row => {
        const line = document.createElement("span");
        const text = document.createElement("em");
        text.textContent = row.type && row.type !== row.group
          ? `${row.group} — ${row.type}`
          : row.group || row.type;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "request-item-remove";
        remove.dataset.requestRemove = row.raw;
        remove.setAttribute("aria-label", "Убрать позицию из заявки");
        remove.textContent = "−";
        line.append(text, remove);
        section.append(line);
      });
      list.append(section);
    }
  };

  const setStatus = (element, message, isError = false) => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  };

  const getCookie = name => {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const cookie of cookies) {
      const [rawKey, ...rawValue] = cookie.trim().split("=");
      if (rawKey === name) return decodeURIComponent(rawValue.join("="));
    }
    return "";
  };

  const getComplianceVersions = () => ({
    consentVersion: document.body.dataset.consentVersion || "",
    privacyVersion: document.body.dataset.privacyVersion || "",
    cookieVersion: document.body.dataset.cookieVersion || "",
  });

  const syncButtons = items => {
    const buttons = document.querySelectorAll("[data-request-item]");
    buttons.forEach(button => {
      button.classList.toggle("is-selected", items.includes(button.dataset.requestItem));
      const sign = button.querySelector("i");
      if (sign) sign.textContent = items.includes(button.dataset.requestItem) ? "−" : "+";
    });
  };

  const renderRequest = () => {
    const items = readItems();
    const text = formatRequestItems(items);
    document.querySelectorAll("[data-request-output]").forEach(output => {
      output.value = text;
    });
    document.querySelectorAll("[data-request-items]").forEach(hiddenItems => {
      hiddenItems.value = JSON.stringify(items);
    });
    document.querySelectorAll("[data-request-count]").forEach(count => {
      count.textContent = String(items.length);
    });
    document.querySelectorAll("[data-request-list]").forEach(list => {
      renderRequestList(list, items);
    });
    document.querySelectorAll("[data-contact-request-items]").forEach(panel => {
      panel.hidden = !items.length;
    });
    syncButtons(items);
  };

  document.addEventListener("click", event => {
    const removeItem = event.target.closest("[data-request-remove]");
    if (removeItem) {
      event.preventDefault();
      writeItems(readItems().filter(item => item !== removeItem.dataset.requestRemove));
      setStatus(document.querySelector("[data-request-status]"), "");
      renderRequest();
      return;
    }

    const button = event.target.closest("[data-request-item]");
    if (button) {
      event.preventDefault();
      const value = button.dataset.requestItem;
      const items = readItems();
      if (items.includes(value)) writeItems(items.filter(item => item !== value));
      else writeItems([...items, value]);
      setStatus(document.querySelector("[data-request-status]"), "");
      renderRequest();
      return;
    }

    const clear = event.target.closest("[data-request-clear]");
    if (clear) {
      event.preventDefault();
      writeItems([]);
      setStatus(document.querySelector("[data-request-status]"), "");
      renderRequest();
    }
  });

  const initCatalogSearch = () => {
    const root = document.querySelector("[data-catalog-search]");
    if (!root) return;
    const input = root.querySelector("[data-catalog-search-input]");
    const submit = root.querySelector("[data-catalog-search-submit]");
    const results = root.querySelector("[data-catalog-search-results]");
    const searchUrl = root.dataset.searchUrl;
    if (!input || !results || !searchUrl) return;

    let controller = null;
    let timer = null;

    const requestSearch = async () => {
      const query = input.value.trim();
      if (controller) controller.abort();
      controller = new AbortController();
      const url = new URL(searchUrl, window.location.origin);
      if (query) url.searchParams.set("q", query);
      root.classList.add("is-loading");
      try {
        const response = await fetch(url, {
          credentials: "same-origin",
          headers: { "X-Requested-With": "XMLHttpRequest" },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Не удалось выполнить поиск.");
        results.innerHTML = data.html || "";
        renderRequest();
      } catch (error) {
        if (error.name !== "AbortError") console.error(error);
      } finally {
        root.classList.remove("is-loading");
      }
    };

    const scheduleSearch = () => {
      clearTimeout(timer);
      timer = setTimeout(requestSearch, 180);
    };

    input.addEventListener("input", scheduleSearch);
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      clearTimeout(timer);
      requestSearch();
    });
    submit?.addEventListener("click", requestSearch);

    root.addEventListener("click", event => {
      const quick = event.target.closest("[data-catalog-search-query]");
      if (quick) {
        input.value = quick.dataset.catalogSearchQuery || "";
        requestSearch();
        input.focus();
        return;
      }

      const reset = event.target.closest("[data-catalog-search-reset]");
      if (!reset) return;
      input.value = "";
      requestSearch();
      input.focus();
    });
  };

  const initCatalogLevelNavigator = () => {
    const root = document.querySelector("[data-catalog-level-shell]");
    const dataScript = document.querySelector("#catalogLevelData");
    if (!root || !dataScript) return;

    let catalogData = {};
    try {
      catalogData = JSON.parse(dataScript.textContent || "{}");
    } catch (error) {
      console.error(error);
      return;
    }

    const nodes = catalogData.nodes || {};
    const roots = catalogData.roots || Object.keys(nodes).filter(id => !nodes[id]?.parent);
    const search = root.querySelector("[data-catalog-level-search]");
    const tree = root.querySelector("[data-catalog-level-tree]");
    const breadcrumbs = root.querySelector("[data-catalog-level-breadcrumbs]");
    const kicker = root.querySelector("[data-catalog-level-kicker]");
    const title = root.querySelector("[data-catalog-level-title]");
    const summary = root.querySelector("[data-catalog-level-summary]");
    const stats = root.querySelector("[data-catalog-level-stats]");
    const media = root.querySelector("[data-catalog-level-media]");
    const childLabel = root.querySelector("[data-catalog-level-child-label]");
    const listTitle = root.querySelector("[data-catalog-level-list-title]");
    const cards = root.querySelector("[data-catalog-level-cards]");
    const openLink = root.querySelector("[data-catalog-level-open]");
    const selectionPanel = root.querySelector("[data-catalog-selection-panel]");
    if (!tree || !cards || !roots.length) return;

    const expanded = new Set(roots);
    let activeId = catalogData.initialActiveId || roots[0];
    let query = "";

    const levelNames = {
      global_block: "Блок",
      direction: "Направление",
      system: "Система",
      product_group: "Товарная группа",
    };

    const nextLevelNames = {
      global_block: "Направления",
      direction: "Системы",
      system: "Товарные группы",
      product_group: "Типы продукции",
    };

    const normalize = value => String(value || "")
      .toLowerCase()
      .replaceAll("ё", "е")
      .replace(/[–—-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const nodeText = node => normalize([
      node.title,
      node.label,
      node.summary,
      ...(node.path || []),
      ...(node.productTypes || []),
      ...(node.brands || []),
      ...(node.attributes || []),
      ...(node.aliases || []),
    ].filter(Boolean).join(" "));

    const getChildren = id => nodes[id]?.children || [];

    const nodeMatchesSelf = id => {
      if (!query) return true;
      return nodeText(nodes[id] || {}).includes(query);
    };

    const subtreeMatches = id => {
      if (!query) return true;
      if (nodeMatchesSelf(id)) return true;
      return getChildren(id).some(childId => subtreeMatches(childId));
    };

    const ancestors = id => {
      const result = [];
      let current = nodes[id];
      while (current?.parent && nodes[current.parent]) {
        result.unshift(current.parent);
        current = nodes[current.parent];
      }
      return result;
    };

    const visibleIds = ids => ids.filter(id => nodes[id] && subtreeMatches(id));

    const firstVisibleId = ids => {
      for (const id of ids) {
        if (!nodes[id] || !subtreeMatches(id)) continue;
        if (nodeMatchesSelf(id)) return id;
        const child = firstVisibleId(getChildren(id));
        return child || id;
      }
      return "";
    };

    const expandPath = id => {
      ancestors(id).forEach(parentId => expanded.add(parentId));
    };

    const expandMatches = () => {
      if (!query) return;
      Object.keys(nodes).forEach(id => {
        if (nodeMatchesSelf(id)) expandPath(id);
      });
    };

    const requestValueFor = (node, typeTitle) => {
      const path = node.path || [];
      const system = path[2] || "";
      const group = path[3] || node.title || "";
      return [system, group, typeTitle || group].filter(Boolean).join("|");
    };

    const button = (className, text = "") => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = className;
      if (text) element.textContent = text;
      return element;
    };

    const renderStats = (target, items) => {
      target.innerHTML = "";
      (items || []).forEach(item => {
        const stat = document.createElement("span");
        const value = document.createElement("b");
        const label = document.createElement("small");
        value.textContent = item.value;
        label.textContent = item.label;
        stat.append(value, label);
        target.append(stat);
      });
    };

    const renderTreeBranch = (ids, depth = 0) => {
      const fragment = document.createDocumentFragment();
      visibleIds(ids).forEach(id => {
        const node = nodes[id];
        const children = getChildren(id);
        const isOpen = expanded.has(id) || Boolean(query);
        const item = document.createElement("div");
        item.className = `catalog-level-tree-item level-${node.level || ""}`;
        item.style.setProperty("--depth", depth);

        const row = document.createElement("div");
        row.className = "catalog-level-tree-row";
        row.classList.toggle("is-active", id === activeId);
        row.classList.toggle("is-match", Boolean(query) && nodeMatchesSelf(id));

        const toggle = button("catalog-level-tree-toggle", children.length ? (isOpen ? "−" : "+") : "");
        toggle.disabled = !children.length;
        toggle.addEventListener("click", () => {
          if (isOpen) expanded.delete(id);
          else expanded.add(id);
          renderTree();
        });

        const select = button("catalog-level-tree-node");
        select.dataset.catalogLevelNode = id;
        const name = document.createElement("span");
        name.textContent = node.title;
        const meta = document.createElement("small");
        const count = children.length || (node.productTypes || []).length || (node.brands || []).length;
        meta.textContent = children.length ? `${count} разделов` : `${count} позиций`;
        select.append(name, meta);

        row.append(toggle, select);
        item.append(row);
        if (children.length && isOpen) {
          const childList = document.createElement("div");
          childList.className = "catalog-level-tree-children";
          childList.append(renderTreeBranch(children, depth + 1));
          item.append(childList);
        }
        fragment.append(item);
      });
      return fragment;
    };

    const renderTree = () => {
      tree.innerHTML = "";
      const visible = visibleIds(roots);
      if (!visible.length) {
        const empty = document.createElement("div");
        empty.className = "catalog-level-empty";
        empty.innerHTML = "<h3>Ничего не найдено</h3><p>Попробуйте другой материал, систему, тип продукции или производителя.</p>";
        tree.append(empty);
        return;
      }
      tree.append(renderTreeBranch(roots));
    };

    const renderBreadcrumbs = node => {
      if (!breadcrumbs) return;
      breadcrumbs.innerHTML = "";
      [...ancestors(node.id), node.id].forEach((id, index, list) => {
        const current = nodes[id];
        if (!current) return;
        if (index > 0) {
          const slash = document.createElement("span");
          slash.textContent = "/";
          breadcrumbs.append(slash);
        }
        const crumb = button("catalog-level-crumb", current.title);
        crumb.dataset.catalogLevelNode = id;
        crumb.classList.toggle("is-current", index === list.length - 1);
        breadcrumbs.append(crumb);
      });
    };

    const renderHero = node => {
      if (kicker) kicker.textContent = levelNames[node.level] || node.label || "Каталог";
      if (title) title.textContent = node.title || "";
      if (summary) summary.textContent = node.summary || "Выберите следующий уровень каталога или добавьте позицию в заявку.";
      if (stats) renderStats(stats, node.stats || []);
      if (openLink) {
        openLink.href = node.url || "#";
        openLink.hidden = !node.url;
      }
      if (media) {
        media.innerHTML = "";
        if (node.image) {
          const image = document.createElement("img");
          image.src = node.image;
          image.alt = node.title || "";
          media.append(image);
        }
      }
    };

    const createChildCard = child => {
      const card = button("catalog-level-card");
      card.dataset.catalogLevelNode = child.id;

      const mediaBox = document.createElement("span");
      mediaBox.className = "catalog-level-card-media";
      if (child.image) {
        const image = document.createElement("img");
        image.src = child.image;
        image.alt = child.title || "";
        mediaBox.append(image);
      }

      const body = document.createElement("span");
      body.className = "catalog-level-card-body";
      const label = document.createElement("small");
      label.textContent = levelNames[child.level] || child.label || "";
      const heading = document.createElement("b");
      heading.textContent = child.title || "";
      const text = document.createElement("span");
      text.textContent = child.summary || (child.path || []).join(" / ");
      const cardStats = document.createElement("span");
      cardStats.className = "catalog-level-card-stats";
      (child.stats || []).slice(0, 3).forEach(stat => {
        const chip = document.createElement("i");
        chip.textContent = `${stat.value} ${stat.label}`;
        cardStats.append(chip);
      });
      body.append(label, heading, text, cardStats);
      card.append(mediaBox, body);
      return card;
    };

    const createTypeRow = (node, typeTitle) => {
      const value = requestValueFor(node, typeTitle);
      const row = button("catalog-level-type-row");
      row.dataset.requestItem = value;
      const name = document.createElement("span");
      name.textContent = typeTitle;
      const action = document.createElement("small");
      action.dataset.catalogTypeAction = "";
      action.textContent = readItems().includes(value) ? "В заявке" : "Добавить";
      row.append(name, action);
      row.classList.toggle("is-selected", readItems().includes(value));
      return row;
    };

    const createManufacturerCard = manufacturer => {
      const link = document.createElement("a");
      link.className = "catalog-level-manufacturer";
      link.href = manufacturer.slug
        ? `/vendors/?vendors=${encodeURIComponent(manufacturer.slug)}#allManufacturers`
        : `/vendors/?q=${encodeURIComponent(manufacturer.name || "")}#allManufacturers`;
      if (manufacturer.logo) {
        const image = document.createElement("img");
        image.src = manufacturer.logo;
        image.alt = manufacturer.name || "";
        link.append(image);
      } else {
        const name = document.createElement("span");
        name.textContent = manufacturer.name || "Производитель";
        link.append(name);
      }
      return link;
    };

    const renderLeaf = node => {
      const section = document.createElement("div");
      section.className = "catalog-level-leaf";

      const types = document.createElement("section");
      types.className = "catalog-level-leaf-section";
      const typeTitle = document.createElement("h4");
      typeTitle.textContent = "Добавить позицию в заявку";
      const typeGrid = document.createElement("div");
      typeGrid.className = "catalog-level-type-list";
      if ((node.productTypes || []).length) {
        node.productTypes.forEach(type => typeGrid.append(createTypeRow(node, type)));
      } else {
        const fallback = createTypeRow(node, node.title);
        typeGrid.append(fallback);
      }
      types.append(typeTitle, typeGrid);
      section.append(types);

      if ((node.manufacturers || []).length) {
        const manufacturers = document.createElement("section");
        manufacturers.className = "catalog-level-leaf-section";
        const manufacturersTitle = document.createElement("h4");
        manufacturersTitle.textContent = "Связанные производители";
        const list = document.createElement("div");
        list.className = "catalog-level-manufacturer-grid";
        node.manufacturers.forEach(manufacturer => list.append(createManufacturerCard(manufacturer)));
        manufacturers.append(manufacturersTitle, list);
        section.append(manufacturers);
      }

      if ((node.attributes || []).length) {
        const attributes = document.createElement("section");
        attributes.className = "catalog-level-leaf-section";
        const attributesTitle = document.createElement("h4");
        attributesTitle.textContent = "Уточняющие параметры";
        const tags = document.createElement("div");
        tags.className = "catalog-level-tag-row";
        node.attributes.slice(0, 18).forEach(attribute => {
          const tag = document.createElement("span");
          tag.textContent = attribute;
          tags.append(tag);
        });
        attributes.append(attributesTitle, tags);
        section.append(attributes);
      }

      return section;
    };

    const renderCards = node => {
      cards.innerHTML = "";
      const children = getChildren(node.id).map(id => nodes[id]).filter(Boolean);
      if (childLabel) childLabel.textContent = nextLevelNames[node.level] || "Каталог";
      if (listTitle) listTitle.textContent = children.length ? `Что входит в «${node.title}»` : "Позиции и производители";

      if (children.length) {
        children.forEach(child => cards.append(createChildCard(child)));
        return;
      }

      cards.append(renderLeaf(node));
      syncButtons(readItems());
    };

    const renderSelectionPanel = () => {
      if (!selectionPanel) return;
      const items = readItems();
      selectionPanel.innerHTML = "";
      selectionPanel.hidden = !items.length;
      if (!items.length) return;

      const head = document.createElement("div");
      head.className = "catalog-level-selection-head";
      const titleElement = document.createElement("h4");
      titleElement.textContent = "Выбрано в заявку";
      const count = document.createElement("span");
      count.textContent = `${items.length}`;
      head.append(titleElement, count);

      const list = document.createElement("div");
      list.className = "catalog-level-selection-list";
      items.slice().reverse().forEach(item => {
        const { system, group, type } = requestItemParts(item);
        const row = document.createElement("div");
        row.className = "catalog-level-selection-item";
        const copy = document.createElement("span");
        const name = document.createElement("b");
        name.textContent = type || group;
        const path = document.createElement("small");
        path.textContent = [system, group].filter(Boolean).join(" / ");
        copy.append(name, path);
        const remove = button("catalog-level-selection-remove", "Г—");
        remove.dataset.catalogSelectionRemove = item;
        remove.setAttribute("aria-label", "Убрать позицию");
        row.append(copy, remove);
        list.append(row);
      });

      const actions = document.createElement("div");
      actions.className = "catalog-level-selection-actions";
      const clearButton = button("btn ghost small", "Очистить");
      clearButton.dataset.catalogSelectionClear = "";
      const requestLink = document.createElement("a");
      requestLink.className = "btn small";
      requestLink.href = "/contacts/#request-form";
      requestLink.textContent = "К заявке";
      actions.append(clearButton, requestLink);

      selectionPanel.append(head, list, actions);
    };

    const renderAll = () => {
      const activeNode = nodes[activeId] || nodes[roots[0]];
      if (!activeNode) return;
      renderTree();
      renderBreadcrumbs(activeNode);
      renderHero(activeNode);
      renderCards(activeNode);
      renderSelectionPanel();
    };

    const setActive = id => {
      if (!nodes[id]) return;
      activeId = id;
      expandPath(id);
      renderAll();
    };

    root.addEventListener("click", event => {
      const nodeButton = event.target.closest("[data-catalog-level-node]");
      if (!nodeButton) return;
      event.preventDefault();
      setActive(nodeButton.dataset.catalogLevelNode);
    });

    selectionPanel?.addEventListener("click", event => {
      const remove = event.target.closest("[data-catalog-selection-remove]");
      if (remove) {
        event.preventDefault();
        writeItems(readItems().filter(item => item !== remove.dataset.catalogSelectionRemove));
        renderRequest();
        return;
      }

      const clearButton = event.target.closest("[data-catalog-selection-clear]");
      if (!clearButton) return;
      event.preventDefault();
      writeItems([]);
      renderRequest();
    });

    search?.addEventListener("input", () => {
      query = normalize(search.value);
      expandMatches();
      if (query && !subtreeMatches(activeId)) activeId = firstVisibleId(roots) || activeId;
      renderAll();
    });

    search?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const first = firstVisibleId(roots);
      if (first) setActive(first);
    });

    document.addEventListener("pnp:request-items-changed", () => {
      syncButtons(readItems());
      renderSelectionPanel();
    });

    expandPath(activeId);
    renderAll();
  };

  const phoneInputSelector = "[data-phone-input]";

  const phoneDigits = value => String(value || "").replace(/\D/g, "");

  const russianPhoneDigits = value => {
    let digits = phoneDigits(value);
    if (!digits) return "";
    if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    else if (digits.startsWith("9")) digits = `7${digits}`;
    else if (!digits.startsWith("7")) digits = `7${digits}`;
    return digits.slice(0, 11);
  };

  const formatRussianPhone = value => {
    const digits = russianPhoneDigits(value);
    if (!digits) return "";

    const local = digits.startsWith("7") ? digits.slice(1) : digits;
    const parts = [];
    if (local.length > 0) parts.push(` (${local.slice(0, 3)}`);
    if (local.length >= 3) parts[0] += ")";
    if (local.length > 3) parts.push(` ${local.slice(3, 6)}`);
    if (local.length > 6) parts.push(`-${local.slice(6, 8)}`);
    if (local.length > 8) parts.push(`-${local.slice(8, 10)}`);
    return `+7${parts.join("")}`;
  };

  const normalizeRussianPhone = value => {
    const digits = russianPhoneDigits(value);
    return digits.length === 11 ? `+${digits}` : formatRussianPhone(value).trim();
  };

  const normalizePhoneInputs = root => {
    root.querySelectorAll(phoneInputSelector).forEach(input => {
      input.value = normalizeRussianPhone(input.value);
    });
  };

  const initPhoneInputs = () => {
    document.querySelectorAll(phoneInputSelector).forEach(input => {
      input.value = formatRussianPhone(input.value);

      input.addEventListener("focus", () => {
        if (!input.value.trim()) input.value = "+7 ";
      });

      input.addEventListener("input", () => {
        input.value = formatRussianPhone(input.value);
      });

      input.addEventListener("blur", () => {
        if (phoneDigits(input.value).length <= 1) input.value = "";
      });
    });

    document.querySelectorAll("form").forEach(form => {
      if (!form.querySelector(phoneInputSelector)) return;
      form.addEventListener("submit", () => normalizePhoneInputs(form), { capture: true });
    });
  };

  const submitForm = async (form, statusElement, submitButton, options = {}) => {
    normalizePhoneInputs(form);
    const formData = new FormData(form);
    if (options.items) formData.set("items", JSON.stringify(options.items));
    if (options.requestText !== undefined) formData.set("request_text", options.requestText);
    if (!formData.get("source")) formData.set("source", "catalog_request");
    const versions = getComplianceVersions();
    formData.set("page_url", window.location.href);
    formData.set("consent_version", versions.consentVersion);
    formData.set("privacy_version", versions.privacyVersion);

    if (submitButton) submitButton.disabled = true;
    setStatus(statusElement, "Отправляем заявку...");
    try {
      const response = await fetch(form.dataset.requestUrl || form.dataset.leadUrl || form.action, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось отправить заявку.");
      }
      setStatus(statusElement, `Заявка #${data.lead_id} сохранена.`);
      form.reset();
      if (form.matches("[data-lead-form]") || form.querySelector("[data-request-items]")) {
        writeItems([]);
        renderRequest();
      }
      return data;
    } catch (error) {
      setStatus(statusElement, error.message || "Не удалось отправить заявку.", true);
      return null;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  };

  document.addEventListener("submit", async event => {
    const miniForm = event.target.closest("[data-mini-request-form]");
    if (!miniForm) return;
    event.preventDefault();
    const items = readItems();
    const output = miniForm.querySelector("[data-request-output]");
    const requestStatus = miniForm.querySelector("[data-request-status]");
    const requestSubmit = miniForm.querySelector("[data-request-submit]");
    const hiddenItems = miniForm.querySelector("[data-request-items]");
    if (!items.length && !output?.value.trim()) {
      setStatus(requestStatus, "Добавьте позицию из каталога.", true);
      return;
    }
    const data = await submitForm(miniForm, requestStatus, requestSubmit, {
      items,
      requestText: output?.value.trim() || "",
    });
    if (data) {
      writeItems([]);
      renderRequest();
      if (hiddenItems) hiddenItems.value = "[]";
    }
  });

  const transferMetaKey = "pnp_home_request_transfer";
  const transferDbName = "pnp_home_request_files";
  const transferStoreName = "files";
  const transferFilesKey = "selected";
  const defaultFileLabel = "Прикрепить файл / спецификацию";
  const filePickerState = new WeakMap();

  const formatFileSize = size => {
    if (!Number.isFinite(size) || size <= 0) return "0 Б";
    const units = ["Б", "КБ", "МБ", "ГБ"];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  };

  const setInputFiles = (fileInput, files) => {
    if (!fileInput || typeof DataTransfer === "undefined") return;
    const transfer = new DataTransfer();
    Array.from(files || []).forEach(file => transfer.items.add(file));
    fileInput.files = transfer.files;
  };

  const fileSignature = file => `${file.name}|${file.size}|${file.lastModified}`;

  const updateFileLabel = (fileLabel, count) => {
    if (!fileLabel) return;
    if (!count) {
      fileLabel.textContent = defaultFileLabel;
      return;
    }
    fileLabel.textContent = count === 1 ? "Выбран 1 файл" : `Выбрано файлов: ${count}`;
  };

  const initFilePicker = form => {
    const fileInput = form.querySelector("input[type='file']");
    const fileLabel = form.querySelector("[data-file-label]");
    let fileList = form.querySelector("[data-file-list]");
    if (!fileInput) return;
    const state = { files: Array.from(fileInput.files || []) };
    filePickerState.set(fileInput, state);

    if (!fileList) {
      fileList = document.createElement("div");
      fileList.className = "file-list";
      fileList.dataset.fileList = "";
      fileList.hidden = true;
      fileInput.after(fileList);
    }

    const renderFiles = () => {
      const files = state.files;
      updateFileLabel(fileLabel, files.length);
      fileList.innerHTML = "";
      fileList.hidden = !files.length;

      files.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "file-list-item";

        const meta = document.createElement("span");
        meta.className = "file-list-meta";
        meta.textContent = `${file.name} В· ${formatFileSize(file.size)}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "file-list-remove";
        remove.dataset.fileRemove = String(index);
        remove.setAttribute("aria-label", `Удалить ${file.name}`);
        remove.textContent = "Г—";

        item.append(meta, remove);
        fileList.append(item);
      });
    };

    const syncFiles = () => {
      setInputFiles(fileInput, state.files);
      renderFiles();
    };

    fileInput.addEventListener("change", () => {
      const existing = new Set(state.files.map(fileSignature));
      Array.from(fileInput.files || []).forEach(file => {
        const signature = fileSignature(file);
        if (existing.has(signature)) return;
        existing.add(signature);
        state.files.push(file);
      });
      syncFiles();
    });

    fileList.addEventListener("click", event => {
      const remove = event.target.closest("[data-file-remove]");
      if (!remove) return;
      const removeIndex = Number(remove.dataset.fileRemove);
      state.files = state.files.filter((_, index) => index !== removeIndex);
      syncFiles();
    });

    syncFiles();
  };

  const openTransferDb = () =>
    new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available."));
        return;
      }
      const request = indexedDB.open(transferDbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(transferStoreName)) db.createObjectStore(transferStoreName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const writeTransferFiles = async files => {
    const db = await openTransferDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(transferStoreName, "readwrite");
        tx.objectStore(transferStoreName).put(Array.from(files || []), transferFilesKey);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  };

  const readTransferFiles = async () => {
    const db = await openTransferDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(transferStoreName, "readonly");
        const request = tx.objectStore(transferStoreName).get(transferFilesKey);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  };

  const clearTransferFiles = async () => {
    try {
      const db = await openTransferDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(transferStoreName, "readwrite");
          tx.objectStore(transferStoreName).delete(transferFilesKey);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    } catch {
      // Nothing to clear.
    }
  };

  const initHomeRequestTransfer = () => {
    const forms = document.querySelectorAll("[data-home-request-transfer]");
    forms.forEach(form => {
      initFilePicker(form);

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const fileInput = form.querySelector("input[type='file']");
        const payload = {
          name: form.elements.name?.value || "",
          phone: form.elements.phone?.value || "",
          message: form.elements.message?.value || "",
        };
        sessionStorage.setItem(transferMetaKey, JSON.stringify(payload));
        try {
          await writeTransferFiles(fileInput?.files || []);
        } catch (error) {
          console.error(error);
        }
        window.location.href = form.dataset.contactUrl || form.action;
      });
    });
  };

  const initCookieConsent = () => {
    const banner = document.querySelector("[data-cookie-consent]");
    if (!banner) return;
    const accept = banner.querySelector("[data-cookie-accept]");
    const reject = banner.querySelector("[data-cookie-reject]");
    const endpoint = banner.dataset.endpoint;
    const versions = getComplianceVersions();
    const storageKeyCookie = "pnp_cookie_consent";

    const readStored = () => {
      try {
        return JSON.parse(localStorage.getItem(storageKeyCookie) || "null");
      } catch {
        return null;
      }
    };

    const stored = readStored();
    const isCurrent = stored
      && stored.consent_version === versions.consentVersion
      && stored.privacy_version === versions.privacyVersion
      && stored.cookie_text_version === versions.cookieVersion
      && ["accepted", "rejected"].includes(stored.choice);

    if (!isCurrent) banner.hidden = false;

    const saveChoice = async choice => {
      const payload = {
        choice,
        consent_version: versions.consentVersion,
        privacy_version: versions.privacyVersion,
        cookie_text_version: versions.cookieVersion,
        page_url: window.location.href,
      };
      const localRecord = {
        ...payload,
        consent_id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKeyCookie, JSON.stringify(localRecord));
      banner.hidden = true;

      if (!endpoint) return;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken") || banner.querySelector("[name='csrfmiddlewaretoken']")?.value || "",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok && data.ok) {
          localStorage.setItem(storageKeyCookie, JSON.stringify({
            ...payload,
            consent_id: data.consent_id,
            timestamp: data.timestamp,
          }));
        }
      } catch (error) {
        console.error(error);
      }

      window.dispatchEvent(new CustomEvent("pnp:cookie-consent", { detail: { choice } }));
    };

    accept?.addEventListener("click", () => saveChoice("accepted"));
    reject?.addEventListener("click", () => saveChoice("rejected"));
  };

  document.querySelectorAll("[data-lead-form]").forEach(form => {
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("[type='submit']");
    initFilePicker(form);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      await submitForm(form, status, submit);
    });
  });

  document.querySelectorAll("[data-mini-request-form]").forEach(form => {
    initFilePicker(form);
  });

  const initContactRequestTransfer = async () => {
    const raw = sessionStorage.getItem(transferMetaKey);
    if (!raw) return;

    const form = document.querySelector("[data-lead-form]");
    if (!form) return;

    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }

    if (payload.name && form.elements.name && !form.elements.name.value) form.elements.name.value = payload.name;
    if (payload.phone && form.elements.phone && !form.elements.phone.value) form.elements.phone.value = payload.phone;
    if (payload.message && form.elements.message && !form.elements.message.value) form.elements.message.value = payload.message;

    try {
      const files = await readTransferFiles();
      const fileInput = form.querySelector("input[type='file']");
      if (files.length && fileInput && typeof DataTransfer !== "undefined") {
        setInputFiles(fileInput, files);
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      sessionStorage.removeItem(transferMetaKey);
      await clearTransferFiles();
    }
  };

  const initContactCatalogItems = () => {
    const form = document.querySelector("[data-lead-form]");
    if (!form) return;
    const hiddenItems = form.querySelector("[data-request-items]");
    const panel = form.querySelector("[data-contact-request-items]");

    const syncContactItems = () => {
      const items = readItems();
      if (hiddenItems) hiddenItems.value = JSON.stringify(items);
      if (panel) panel.hidden = !items.length;
    };

    syncContactItems();
    document.addEventListener("pnp:request-items-changed", syncContactItems);
  };

  const initHomeBrandCarousel = () => {
    document.querySelectorAll("[data-brand-carousel]").forEach(carousel => {
      const track = carousel.querySelector("[data-brand-track]");
      const prev = carousel.querySelector("[data-brand-prev]");
      const next = carousel.querySelector("[data-brand-next]");
      if (!track || !prev || !next) return;

      let frame = null;

      const updateButtons = () => {
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        prev.disabled = track.scrollLeft <= 4;
        next.disabled = track.scrollLeft >= maxScroll - 4;
        carousel.classList.toggle("is-scrollable", maxScroll > 4);
      };

      const scheduleUpdate = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(updateButtons);
      };

      const scrollTrack = direction => {
        const distance = Math.max(track.clientWidth * 0.82, 320);
        track.scrollBy({ left: direction * distance, behavior: "smooth" });
      };

      prev.addEventListener("click", () => scrollTrack(-1));
      next.addEventListener("click", () => scrollTrack(1));
      track.addEventListener("scroll", scheduleUpdate);
      window.addEventListener("resize", scheduleUpdate);
      updateButtons();
    });
  };

  const initVendorFilters = () => {
    const form = document.querySelector("[data-vendor-filter-form]");
    if (!form) return;

    const search = form.querySelector("#vendorSearch");
    const blockSelect = form.querySelector("#vendorBlock");
    const directionSelect = form.querySelector("#vendorDirection");
    const systemSelect = form.querySelector("#vendorSystem");
    const groupSelect = form.querySelector("#vendorGroup");
    const submit = form.querySelector("[type='submit']");
    const clearButton = form.querySelector("[data-vendor-clear]");
    const count = document.querySelector("[data-vendor-count]");
    const cloud = document.querySelector("[data-vendor-cloud]");
    const rows = document.querySelector("[data-vendor-rows]");
    const selectedList = form.querySelector("[data-selected-vendors]");
    const suggestions = form.querySelector("[data-vendor-suggestions]");
    const vendorOptionsData = document.querySelector("#vendorOptionsData");
    const vendorOptions = vendorOptionsData ? JSON.parse(vendorOptionsData.textContent || "[]") : [];
    const selectedVendors = new Map();
    let controller = null;

    const normalizeVendor = value => String(value || "").trim().toLowerCase().replaceAll("ё", "е");

    const findVendor = (value, name) => {
      const normalizedValue = normalizeVendor(value);
      const normalizedName = normalizeVendor(name);
      return (
        vendorOptions.find(item => item.slug === value)
        || vendorOptions.find(item => normalizeVendor(item.name) === normalizedValue)
        || vendorOptions.find(item => normalizeVendor(item.name) === normalizedName)
      );
    };

    selectedList?.querySelectorAll("[data-vendor-hidden]").forEach(input => {
      const vendor = vendorOptions.find(item => item.slug === input.value) || { slug: input.value, name: input.value };
      selectedVendors.set(vendor.slug, vendor.name);
    });

    const customSelects = [];

    const closeCustomSelects = except => {
      customSelects.forEach(({ wrapper, menu, button }) => {
        if (wrapper === except) return;
        menu.hidden = true;
        wrapper.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      });
    };

    const syncCustomSelect = select => {
      const control = customSelects.find(item => item.select === select);
      if (!control) return;
      const selectedOption = select.options[select.selectedIndex] || select.options[0];
      control.label.textContent = selectedOption ? selectedOption.textContent.trim() : "";
      control.menu.querySelectorAll("[data-vendor-select-option]").forEach(option => {
        option.classList.toggle("is-selected", option.dataset.value === select.value);
      });
    };

    const syncCustomSelects = () => {
      customSelects.forEach(({ select }) => syncCustomSelect(select));
    };

    [blockSelect, directionSelect, systemSelect, groupSelect].forEach(select => {
      if (!select) return;
      select.classList.add("vendor-filter-native");
      select.tabIndex = -1;

      const wrapper = document.createElement("div");
      wrapper.className = "vendor-custom-select";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "vendor-select-button";
      button.setAttribute("aria-expanded", "false");

      const label = document.createElement("span");
      button.append(label);

      const menu = document.createElement("div");
      menu.className = "vendor-select-menu";
      menu.hidden = true;

      Array.from(select.options).forEach(option => {
        const item = document.createElement("button");
        item.type = "button";
        item.dataset.vendorSelectOption = "";
        item.dataset.value = option.value;
        item.textContent = option.textContent.trim();
        menu.append(item);
      });

      wrapper.append(button, menu);
      select.after(wrapper);
      customSelects.push({ select, wrapper, button, label, menu });

      button.addEventListener("click", () => {
        const willOpen = menu.hidden;
        closeCustomSelects(wrapper);
        menu.hidden = !willOpen;
        wrapper.classList.toggle("is-open", willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
      });

      button.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        closeCustomSelects();
        hideSuggestions();
        updateVendors();
      });

      menu.addEventListener("click", event => {
        const option = event.target.closest("[data-vendor-select-option]");
        if (!option) return;
        select.value = option.dataset.value || "";
        syncCustomSelect(select);
        closeCustomSelects();
      });
    });

    syncCustomSelects();

    const buildUrl = () => {
      const url = new URL(form.action || window.location.href, window.location.origin);
      const data = new FormData(form);
      data.forEach((value, key) => {
        const text = String(value || "").trim();
        if (!text) return;
        if (key === "vendors") url.searchParams.append(key, text);
        else url.searchParams.set(key, text);
      });
      return url;
    };

    const writeUrl = (url, options = {}) => {
      if (!window.history || !window.history.replaceState) return;
      const hash = options.rowsHash || (window.location.hash === "#vendorRowsSection" ? "#vendorRowsSection" : "");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${hash}`);
    };

    const scrollToRows = () => {
      const target = document.querySelector("#vendorRowsSection");
      if (!target) return;
      const topbar = document.querySelector(".topbar");
      const offset = (topbar ? topbar.getBoundingClientRect().height : 76) + 18;
      const top = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - offset);
      window.scrollTo({ top, behavior: "smooth" });
    };

    const requestVendors = async (url, options = {}) => {
      if (controller) controller.abort();
      controller = new AbortController();
      if (submit) submit.disabled = true;
      try {
        const response = await fetch(url, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Не удалось обновить производителей.");
        const data = await response.json();
        if (count && data.count_html !== undefined) count.innerHTML = data.count_html;
        if (cloud && data.cloud_html !== undefined) cloud.innerHTML = data.cloud_html;
        if (rows && data.rows_html !== undefined) rows.innerHTML = data.rows_html;
        syncVendorChipState();
        writeUrl(url, options);
        if (options.scroll) requestAnimationFrame(scrollToRows);
      } catch (error) {
        if (error.name !== "AbortError") console.error(error);
      } finally {
        if (submit) submit.disabled = false;
      }
    };

    const updateVendors = async (options = {}) => {
      await requestVendors(buildUrl(), options);
    };

    const hideSuggestions = () => {
      if (!suggestions) return;
      suggestions.hidden = true;
      suggestions.innerHTML = "";
    };

    const syncVendorChipState = () => {
      document.querySelectorAll("[data-vendor-chip]").forEach(chip => {
        const value = chip.dataset.vendorChip || "";
        const name = chip.dataset.vendorChipName || chip.textContent.trim();
        const vendor = findVendor(value, name);
        const isSelected = vendor
          ? selectedVendors.has(vendor.slug)
          : [...selectedVendors.values()].some(selectedName => normalizeVendor(selectedName) === normalizeVendor(name || value));
        chip.classList.toggle("is-selected", isSelected);
        chip.setAttribute("aria-pressed", String(isSelected));
      });
    };

    const renderSelectedVendors = () => {
      if (!selectedList) return;
      selectedList.innerHTML = "";
      for (const [slug] of selectedVendors) {
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = "vendors";
        hidden.value = slug;
        hidden.dataset.vendorHidden = slug;
        selectedList.append(hidden);
      }
      syncVendorChipState();
    };

    const addVendor = (slug, name) => {
      if (!slug) return;
      selectedVendors.set(slug, name || slug);
      if (search) search.value = "";
      hideSuggestions();
      renderSelectedVendors();
    };

    const toggleVendor = (slug, name) => {
      if (!slug) return;
      if (selectedVendors.has(slug)) selectedVendors.delete(slug);
      else selectedVendors.set(slug, name || slug);
      if (search) search.value = "";
      hideSuggestions();
      renderSelectedVendors();
    };

    const clearAllFilters = () => {
      if (search) search.value = "";
      [blockSelect, directionSelect, systemSelect, groupSelect].forEach(select => {
        if (select) select.value = "";
      });
      selectedVendors.clear();
      hideSuggestions();
      syncCustomSelects();
      renderSelectedVendors();
      updateVendors();
    };

    const showSuggestions = () => {
      if (!search || !suggestions) return;
      const query = normalizeVendor(search.value);
      if (!query) {
        hideSuggestions();
        return;
      }

      const matches = vendorOptions
        .filter(vendor => !selectedVendors.has(vendor.slug) && normalizeVendor(vendor.name).startsWith(query))
        .slice(0, 10);

      suggestions.innerHTML = "";
      if (!matches.length) {
        suggestions.hidden = true;
        return;
      }

      for (const vendor of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.vendorSuggestion = vendor.slug;
        button.textContent = vendor.name;
        suggestions.append(button);
      }
      suggestions.hidden = false;
    };

    form.addEventListener("submit", event => {
      event.preventDefault();
      hideSuggestions();
      updateVendors();
    });

    clearButton?.addEventListener("click", clearAllFilters);

    if (search) {
      search.addEventListener("input", showSuggestions);
      search.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        hideSuggestions();
        updateVendors();
      });
    }

    [blockSelect, directionSelect, systemSelect, groupSelect].forEach(select => {
      if (!select) return;
      select.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        hideSuggestions();
        updateVendors();
      });
    });

    document.addEventListener("click", event => {
      const pageLink = event.target.closest("[data-vendor-page-link]");
      if (pageLink) {
        event.preventDefault();
        hideSuggestions();
        requestVendors(new URL(pageLink.href), { scroll: true });
        return;
      }

      const suggestion = event.target.closest("[data-vendor-suggestion]");
      if (suggestion) {
        event.preventDefault();
        const vendor = vendorOptions.find(item => item.slug === suggestion.dataset.vendorSuggestion);
        if (vendor) addVendor(vendor.slug, vendor.name);
        return;
      }

      const remove = event.target.closest("[data-vendor-remove]");
      if (remove) {
        event.preventDefault();
        selectedVendors.delete(remove.dataset.vendorRemove);
        renderSelectedVendors();
        return;
      }

      const chip = event.target.closest("[data-vendor-chip]");
      if (!chip) return;
      event.preventDefault();
      const value = chip.dataset.vendorChip || "";
      const name = chip.dataset.vendorChipName || chip.textContent.trim();
      const vendor = findVendor(value, name);
      if (vendor) toggleVendor(vendor.slug, vendor.name);
      else if (search) search.value = name || value;
      search?.focus();
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".vendor-custom-select")) closeCustomSelects();
      if (form.contains(event.target)) return;
      hideSuggestions();
    });

    document.querySelectorAll("[data-vendor-direction-card]").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        if (search) search.value = "";
        if (blockSelect) blockSelect.value = "";
        if (systemSelect) systemSelect.value = "";
        if (groupSelect) groupSelect.value = "";
        if (directionSelect) directionSelect.value = link.dataset.vendorDirectionCard || "";
        selectedVendors.clear();
        hideSuggestions();
        renderSelectedVendors();
        syncCustomSelects();
        updateVendors({ scroll: true, rowsHash: "#vendorRowsSection" });
      });
    });

    syncVendorChipState();
  };

  const initPartnersFilter = () => {
    const form = document.querySelector("[data-partners-filter-form]");
    if (!form) return;
    const categoryList = form.querySelector("[data-partner-category-list]");
    const results = document.querySelector("[data-partner-results]");
    const search = form.querySelector("input[name='q']");
    if (!categoryList || !results) return;

    let requestId = 0;

    const buildUrl = page => {
      const url = new URL(form.action, window.location.origin);
      const formData = new FormData(form);
      const query = String(formData.get("q") || "").trim();
      if (query) url.searchParams.set("q", query);
      formData.getAll("category").forEach(category => {
        if (category) url.searchParams.append("category", category);
      });
      if (page) url.searchParams.set("page", page);
      return url;
    };

    const updatePartners = async urlOverride => {
      const url = urlOverride || buildUrl();
      const currentRequest = ++requestId;
      form.classList.add("is-loading");
      try {
        const response = await fetch(url, {
          credentials: "same-origin",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        const data = await response.json();
        if (!response.ok || currentRequest !== requestId) return;
        categoryList.innerHTML = data.categories_html;
        results.innerHTML = data.results_html;
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      } catch (error) {
        console.error(error);
      } finally {
        if (currentRequest === requestId) form.classList.remove("is-loading");
      }
    };

    form.addEventListener("submit", event => {
      event.preventDefault();
      updatePartners();
    });

    form.addEventListener("change", event => {
      if (!event.target.matches("input[name='category']")) return;
      updatePartners();
    });

    form.addEventListener("click", event => {
      const clearButton = event.target.closest("[data-partner-clear-categories]");
      if (!clearButton) return;
      event.preventDefault();
      form.querySelectorAll("input[name='category']").forEach(input => {
        input.checked = false;
      });
      updatePartners();
    });

    results.addEventListener("click", event => {
      const pageLink = event.target.closest("[data-partner-page-link]");
      if (!pageLink) return;
      event.preventDefault();
      updatePartners(new URL(pageLink.href, window.location.origin));
    });

    search?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      updatePartners();
    });
  };

  const initCatalogNavigation = () => {
    const tree = document.querySelector("[data-catalog-tree]");
    const searchInput = document.querySelector("[data-catalog-search]");
    const searchResults = document.querySelector("[data-catalog-search-results]");
    const searchClear = document.querySelector("[data-catalog-search-clear]");
    const searchDataNode = document.querySelector("#catalogSearchData");
    const interactiveDataNode = document.querySelector("#catalogInteractiveData");
    const stage = document.querySelector("[data-catalog-stage]");
    const grid = document.querySelector("[data-catalog-card-grid]");
    const stageTitle = document.querySelector("[data-catalog-stage-title]");
    const breadcrumbs = document.querySelector("[data-catalog-breadcrumbs]");
    const layout = document.querySelector(".catalog-layout");

    let catalogData = null;
    try {
      catalogData = interactiveDataNode ? JSON.parse(interactiveDataNode.textContent || "null") : null;
    } catch {
      catalogData = null;
    }

    const escapeHtml = value =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const nodes = catalogData?.nodes || {};
    const root = catalogData?.root || null;
    const urlToTarget = new Map();
    Object.values(nodes).forEach(node => {
      if (node.url) urlToTarget.set(new URL(node.url, window.location.origin).pathname, node.id);
    });

    const nodeByTarget = target => (target === "root" ? root : nodes[target]);

    const findTarget = element => {
      const explicit = element?.dataset?.catalogTarget;
      if (explicit && nodeByTarget(explicit)) return explicit;
      if (!element?.href) return "";
      return urlToTarget.get(new URL(element.href, window.location.origin).pathname) || "";
    };

    const renderBreadcrumbs = node => {
      if (!breadcrumbs || !node) return;
      const rows = node.breadcrumbs || root?.breadcrumbs || [];
      const links = rows.map((item, index) => {
        const last = index === rows.length - 1;
        if (last) return `<span>${escapeHtml(item.title)}</span>`;
        return `<button type="button" data-catalog-link data-catalog-target="${escapeHtml(item.target)}">${escapeHtml(item.title)}</button>`;
      }).join("");
      breadcrumbs.innerHTML = `<nav class="catalog-breadcrumbs" aria-label="Навигация каталога">${links}</nav>`;
    };

    const renderStats = stats =>
      (stats || [])
        .filter(item => Number(item.value) > 0)
        .map(item => `<span>${escapeHtml(item.value)} ${escapeHtml(item.label)}</span>`)
        .join("");

    const renderChips = chips =>
      (chips || [])
        .filter(Boolean)
        .slice(0, 5)
        .map(chip => `<span>${escapeHtml(chip)}</span>`)
        .join("");

    const vendorFilterUrl = vendor => {
      if (vendor?.slug) return `/vendors/?vendors=${encodeURIComponent(vendor.slug)}#allManufacturers`;
      return `/vendors/?q=${encodeURIComponent(vendor?.name || "")}#allManufacturers`;
    };

    const currentCardHtml = node => {
      if (!node || node.kind === "root") return "";
      return `
        <article class="catalog-stage-current-card" style="--stage-image:url('${escapeHtml(node.image)}')">
          <span class="soft-label">${escapeHtml(node.level)}</span>
          <h2>${escapeHtml(node.title)}</h2>
          <p>${escapeHtml(node.summary || "Откройте следующий уровень каталога.")}</p>
          <div class="catalog-hero-meta">${renderStats(node.stats)}</div>
        </article>`;
    };

    const cardHtml = (node, index, compact = false) => `
      <a class="catalog-level-card${compact ? " catalog-level-card-compact" : ""}" href="${escapeHtml(node.url || "#")}" data-catalog-link data-catalog-target="${escapeHtml(node.id)}">
        <div class="catalog-level-media">
          <img src="${escapeHtml(node.image)}" alt="${escapeHtml(node.title)}">
        </div>
        <div class="catalog-level-body">
          <div class="catalog-level-kicker">
            <span>${escapeHtml(node.level)}</span>
            <b>${String(index + 1).padStart(2, "0")}</b>
          </div>
          <h3>${escapeHtml(node.title)}</h3>
          <p>${escapeHtml(node.summary || "Откройте следующий уровень каталога.")}</p>
          <div class="catalog-level-stats">${renderStats(node.stats)}</div>
          <div class="catalog-level-chips">${renderChips(node.chips)}</div>
        </div>
      </a>`;

    const renderLevel = target => {
      if (!catalogData || !stage) return false;
      const node = nodeByTarget(target) || root;
      if (!node) return false;
      layout?.classList.remove("is-product-mode");
      renderBreadcrumbs(node);
      const childIds = node.children || [];
      const cards = childIds
        .map((id, index) => nodes[id] ? cardHtml(nodes[id], index, node.kind !== "root") : "")
        .join("");
      const gridClass = childIds.length === root?.children?.length
        ? "catalog-level-grid catalog-block-grid"
        : "catalog-level-grid catalog-next-grid";
      const title = node.kind === "root" ? "Глобальные блоки" : "Следующий уровень";
      stage.innerHTML = `
        ${currentCardHtml(node)}
        <div class="section-head" data-catalog-stage-head>
          <div>
            <span class="soft-label">Следующий уровень</span>
            <h2 data-catalog-stage-title>${escapeHtml(title)}</h2>
          </div>
          <a class="link-more" href="/contacts/#request-form">Отправить спецификацию →</a>
        </div>
        <div class="${gridClass}" data-catalog-card-grid>${cards}</div>`;
      if (!childIds.length) {
        stage.querySelector("[data-catalog-card-grid]").innerHTML = `
          <article class="glass catalog-empty-state">
            <h3>На этом уровне пока нет элементов</h3>
            <p>Структура сохранена в базе. Следующий уровень можно добавить через импорт или ORM.</p>
          </article>`;
      }
      syncTree(target);
      return true;
    };

    const renderGroup = target => {
      if (!catalogData || !stage) return false;
      const group = nodes[target];
      if (!group || group.kind !== "group") return false;
      layout?.classList.add("is-product-mode");
      renderBreadcrumbs(group);
      const groupTypes = (group.types || []).length ? group.types : [{ title: group.title }];
      const typeRows = groupTypes.map(type => {
        const requestItem = `${group.systemTitle}|${group.title}|${type.title}`;
        return `
          <button class="catalog-product-type-row" type="button" data-request-item="${escapeHtml(requestItem)}">
            <span>
              <b>${escapeHtml(type.title)}</b>
              <small>Добавить этот тип в заявку</small>
            </span>
            <i aria-hidden="true">+</i>
          </button>`;
      }).join("");
      const brandRows = (group.vendors || []).length
        ? group.vendors.map(vendor => `
            <a class="logo-tile" href="${escapeHtml(vendorFilterUrl(vendor))}" title="${escapeHtml(vendor.name)}">
              ${vendor.logo ? `<img src="${escapeHtml(vendor.logo)}" alt="${escapeHtml(vendor.name)}">` : `<span>${escapeHtml(vendor.name)}</span>`}
            </a>`).join("")
        : `<div class="catalog-product-empty-note">Производители уточняются снабжением.</div>`;

      stage.innerHTML = `
        <article class="catalog-product-hero-card" style="--catalog-hero-image:url('${escapeHtml(group.image)}')">
          <span class="soft-label">Товарная группа</span>
          <h1>${escapeHtml(group.title)}</h1>
          <p>${escapeHtml(group.summary)}</p>
          <div class="catalog-hero-meta">${renderStats(group.stats)}</div>
        </article>

        <div class="catalog-product-title-row">
          <div>
            <h2>Подбор по товарной группе</h2>
            <p>Выберите тип продукции или сразу отправьте позицию в заявку.</p>
          </div>
        </div>

        <article class="glass catalog-product-passport-card">
          <span class="soft-label">Паспорт товарной группы</span>
          <h2>${escapeHtml(group.title)}</h2>
          <p>${escapeHtml(group.summary)}</p>
          <div class="catalog-product-passport-grid">
            <section class="catalog-product-type-panel">
              <h3>Типы продукции</h3>
              <div class="catalog-product-type-list">${typeRows}</div>
            </section>
            <section class="catalog-product-brand-panel">
              <h3>Бренды / производители</h3>
              <div class="catalog-product-brand-grid">${brandRows}</div>
            </section>
          </div>
        </article>

        <section class="glass catalog-mini-request catalog-mini-request-compact" data-catalog-request-panel>
          <input type="hidden" name="items" data-request-items>
          <textarea class="mini-request-raw" name="request_text" data-request-output aria-label="Комментарий к заявке"></textarea>
          <div class="mini-request-head">
            <div>
              <span class="soft-label">Мини-заявка <b data-request-count>0</b></span>
              <h3>Выбранные позиции</h3>
            </div>
            <button class="btn ghost small" type="button" data-request-clear>Очистить</button>
          </div>
          <div class="mini-request-selected-list" data-request-list>Выберите тип продукции — здесь появится структура заявки из каталога.</div>
          <div class="mini-request-actions">
            <a class="btn light" href="/contacts/#request-form">Перейти к заявке</a>
          </div>
        </section>`;
      syncTree(target);
      renderRequest();
      return true;
    };

    const syncTree = target => {
      if (!tree) return;
      tree.querySelectorAll("[data-catalog-link]").forEach(link => {
        link.classList.toggle("is-active", link.dataset.catalogTarget === target);
      });
      tree.querySelectorAll("[data-catalog-node]").forEach(node => {
        node.classList.remove("is-current-branch");
      });
      const active = tree.querySelector(`[data-catalog-target="${CSS.escape(target)}"]`);
      if (!active) return;
      let current = active.closest("[data-catalog-node]");
      while (current) {
        current.classList.add("is-open", "is-current-branch");
        const toggle = current.querySelector(":scope > .catalog-tree-row [data-catalog-toggle]");
        if (toggle) toggle.setAttribute("aria-expanded", "true");
        current = current.parentElement?.closest("[data-catalog-node]");
      }
    };

    const selectTarget = target => {
      const node = nodeByTarget(target);
      if (!node) return false;
      const rendered = node.kind === "group" ? renderGroup(target) : renderLevel(target);
      if (rendered && stage) {
        const topbar = document.querySelector(".topbar");
        const offset = (topbar ? topbar.getBoundingClientRect().height : 76) + 18;
        const top = Math.max(0, stage.getBoundingClientRect().top + window.pageYOffset - offset);
        window.scrollTo({ top, behavior: "auto" });
      }
      return rendered;
    };

    if (tree) {
      tree.addEventListener("click", event => {
        const toggle = event.target.closest("[data-catalog-toggle]");
        if (!toggle) return;
        event.preventDefault();
        event.stopPropagation();
        const node = toggle.closest("[data-catalog-node]");
        if (!node) return;
        const nextState = !node.classList.contains("is-open");
        node.classList.toggle("is-open", nextState);
        toggle.setAttribute("aria-expanded", String(nextState));
      });
    }

    document.addEventListener("click", event => {
      const link = event.target.closest("[data-catalog-link]");
      if (!link) return;
      const target = findTarget(link);
      if (!target || !catalogData) return;
      event.preventDefault();
      searchResults && (searchResults.hidden = true);
      selectTarget(target);
    });

    if (!searchInput || !searchResults || !searchDataNode) return;

    let searchItems = [];
    try {
      searchItems = JSON.parse(searchDataNode.textContent || "[]");
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

    const scoreItem = (item, query) => {
      const normalizedQuery = normalize(query);
      if (!normalizedQuery) return 0;

      const title = normalize(item.title);
      const path = normalize(item.path);
      const aliases = (item.aliases || []).map(normalize).filter(Boolean);
      const haystack = [title, path, ...aliases].join(" ");
      const words = tokenize(title);
      const acronymQuery = String(query || "").trim().toUpperCase();
      const hasAcronymAtStart = acronymQuery
        ? new RegExp(`^${escapeRegExp(acronymQuery)}([^\\p{L}\\p{N}]|$)`, "u").test(String(item.title || ""))
        : false;
      const hasAcronymWord = acronymQuery
        ? new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(acronymQuery)}([^\\p{L}\\p{N}]|$)`, "u").test(String(item.title || ""))
        : false;

      if (title === normalizedQuery) return 140;
      if (normalizedQuery.length <= 2) {
        if (hasAcronymAtStart) return 132;
        if (hasAcronymWord) return 124;
        if (aliases.includes(normalizedQuery)) return 112;
        return 0;
      }

      if (title.startsWith(normalizedQuery)) return 132;
      if (words.includes(normalizedQuery)) return 124;
      if (aliases.includes(normalizedQuery)) return 112;

      if (haystack.includes(normalizedQuery)) return 42;

      const queryWords = tokenize(normalizedQuery);
      if (queryWords.length && queryWords.every(word => haystack.includes(word))) return 30;
      return 0;
    };

    const renderSearch = () => {
      const query = searchInput.value.trim();
      searchResults.innerHTML = "";
      if (!query) {
        searchResults.hidden = true;
        return;
      }

      const matches = searchItems
        .map(item => ({ ...item, score: scoreItem(item, query) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ru"))
        .slice(0, 12);

      if (!matches.length) {
        const empty = document.createElement("p");
        empty.textContent = "Ничего не найдено. Попробуйте название материала, системы или производителя.";
        searchResults.append(empty);
        searchResults.hidden = false;
        return;
      }

      matches.forEach(item => {
        const link = document.createElement("a");
        link.href = item.url;
        if (item.target) link.dataset.catalogTarget = item.target;
        link.dataset.catalogLink = "";
        link.className = "catalog-search-result";
        const title = document.createElement("b");
        const level = document.createElement("span");
        const path = document.createElement("small");
        title.textContent = item.title;
        level.textContent = item.level;
        path.textContent = item.path;
        link.append(title, level, path);
        searchResults.append(link);
      });
      searchResults.hidden = false;
    };

    searchInput.addEventListener("input", renderSearch);
    searchInput.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const first = searchResults.querySelector("a");
      if (!first) return;
      event.preventDefault();
      first.focus();
    });
    searchClear?.addEventListener("click", () => {
      searchInput.value = "";
      searchResults.innerHTML = "";
      searchResults.hidden = true;
      searchInput.focus();
    });
    document.addEventListener("click", event => {
      if (event.target.closest(".catalog-search-box")) return;
      searchResults.hidden = true;
    });
  };

  const initHomeDesktopExperience = () => {
    if (!document.body.classList.contains("home-page")) return;

    const whyRoot = document.querySelector("[data-home-why]");
    if (whyRoot) {
      const cards = [...whyRoot.querySelectorAll("[data-home-why-card]")];
      const index = whyRoot.querySelector("[data-home-why-index]");
      const label = whyRoot.querySelector("[data-home-why-label]");
      const title = whyRoot.querySelector("[data-home-why-title]");
      const detail = whyRoot.querySelector("[data-home-why-detail]");

      const selectWhyCard = card => {
        cards.forEach(item => item.classList.toggle("is-active", item === card));
        if (index) index.textContent = card.dataset.index || "";
        if (label) label.textContent = card.dataset.label || "";
        if (title) title.textContent = card.dataset.title || "";
        if (detail) detail.textContent = card.dataset.detail || "";
      };

      cards.forEach(card => {
        card.addEventListener("click", () => selectWhyCard(card));
        card.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectWhyCard(card);
        });
      });
    }

    const supplyRoot = document.querySelector("[data-home-supply]");
    if (supplyRoot) {
      const spheres = [...supplyRoot.querySelectorAll("[data-home-supply-sphere]")];
      const directions = [...supplyRoot.querySelectorAll("[data-home-supply-direction]")];
      const previewImage = supplyRoot.querySelector("[data-home-supply-image]");
      const previewTitle = supplyRoot.querySelector("[data-home-supply-title]");
      const previewDescription = supplyRoot.querySelector("[data-home-supply-description]");
      const previewLink = supplyRoot.querySelector("[data-home-supply-link]");

      const selectDirection = direction => {
        directions.forEach(item => item.classList.toggle("is-active", item === direction));
        if (previewTitle) previewTitle.textContent = direction.dataset.title || "";
        if (previewDescription) previewDescription.textContent = direction.dataset.description || "";
        if (previewLink && direction.dataset.url) previewLink.href = direction.dataset.url;
        if (previewImage && direction.dataset.image) {
          previewImage.src = direction.dataset.image;
          previewImage.alt = direction.dataset.title || "";
          previewImage.hidden = false;
        }
      };

      const openSphere = sphere => {
        spheres.forEach(item => {
          const active = item === sphere;
          item.classList.toggle("is-active", active);
          item.querySelector("[data-home-supply-block]")?.setAttribute("aria-expanded", String(active));
        });
        const firstDirection = sphere.querySelector("[data-home-supply-direction]");
        if (firstDirection) selectDirection(firstDirection);
      };

      spheres.forEach(sphere => {
        sphere.querySelector("[data-home-supply-block]")?.addEventListener("click", () => openSphere(sphere));
      });
      directions.forEach(direction => {
        direction.addEventListener("click", () => selectDirection(direction));
      });
    }

    const workflow = document.querySelector("[data-home-request-workflow]");
    if (workflow) {
      const steps = [...workflow.querySelectorAll("[data-home-request-step]")];
      const image = workflow.querySelector("[data-home-request-image]");
      const index = workflow.querySelector("[data-home-request-index]");
      const title = workflow.querySelector("[data-home-request-title]");
      const detail = workflow.querySelector("[data-home-request-detail]");

      const selectStep = step => {
        steps.forEach(item => {
          const active = item === step;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });
        if (index) index.textContent = `${step.dataset.index || ""} / ${step.dataset.label || ""}`;
        if (title) title.textContent = step.dataset.title || "";
        if (detail) detail.textContent = step.dataset.detail || "";
        if (image && step.dataset.image) {
          image.src = step.dataset.image;
          image.alt = step.dataset.title || "";
        }
      };

      steps.forEach(step => step.addEventListener("click", () => selectStep(step)));
    }
  };

  initCatalogNavigation();
  initVendorFilters();
  initPartnersFilter();
  initCatalogSearch();
  initCatalogLevelNavigator();
  initHomeBrandCarousel();
  initHomeDesktopExperience();
  initHomeRequestTransfer();
  initContactRequestTransfer();
  initContactCatalogItems();
  initPhoneInputs();
  initCookieConsent();
  renderRequest();
});
