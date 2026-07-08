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
  const output = document.querySelector("[data-request-output]");
  const hiddenItems = document.querySelector("[data-request-items]");
  const clear = document.querySelector("[data-request-clear]");
  const miniForm = document.querySelector("[data-mini-request-form]");
  const requestStatus = document.querySelector("[data-request-status]");
  const requestSubmit = document.querySelector("[data-request-submit]");
  const recentLists = document.querySelectorAll("[data-catalog-recent-list]");

  const readItems = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  };

  const writeItems = items => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  };

  const setStatus = (element, message, isError = false) => {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  };

  const syncButtons = items => {
    document.querySelectorAll("[data-request-item]").forEach(button => {
      const selected = items.includes(button.dataset.requestItem);
      button.classList.toggle("is-selected", selected);
      if (button.classList.contains("catalog-search-add")) {
        button.textContent = selected ? "В заявке" : "Добавить в заявку";
      }
      if (button.classList.contains("catalog-level-type-row")) {
        const action = button.querySelector("[data-catalog-type-action]");
        if (action) action.textContent = selected ? "В заявке" : "Добавить";
      }
    });
  };

  const requestItemParts = item => {
    const [system = "", group = "", type = ""] = String(item || "").split("|");
    return { system, group, type };
  };

  const formatRequestItems = items => {
    if (!items.length) return "";
    const groups = new Map();
    for (const item of items) {
      const { system, group, type } = requestItemParts(item);
      const key = [system, group].filter(Boolean).join(": ");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(type || group);
    }
    const lines = ["Заявка из каталога:"];
    for (const [group, types] of groups) {
      lines.push(`${group}:`);
      for (const type of types) lines.push(`- ${type}`);
    }
    return lines.join("\n");
  };

  const renderRecentItems = () => {
    const items = readItems();
    recentLists.forEach(list => {
      list.innerHTML = "";
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "catalog-recent-empty";
        empty.textContent = "Позиции пока не выбраны.";
        list.append(empty);
        return;
      }
      items.slice(-6).reverse().forEach(item => {
        const { system, group, type } = requestItemParts(item);
        const row = document.createElement("div");
        row.className = "catalog-recent-item";

        const text = document.createElement("span");
        const title = document.createElement("b");
        title.textContent = type || group;
        const path = document.createElement("small");
        path.textContent = [system, group].filter(Boolean).join(" / ");
        text.append(title, path);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.catalogRecentRemove = item;
        remove.setAttribute("aria-label", "Убрать позицию");
        remove.textContent = "×";

        row.append(text, remove);
        list.append(row);
      });
    });
  };

  const renderRequest = () => {
    const items = readItems();
    if (hiddenItems) hiddenItems.value = JSON.stringify(items);
    syncButtons(items);
    renderRecentItems();
    const requestText = formatRequestItems(items);
    if (output) output.value = requestText;
    document.dispatchEvent(new CustomEvent("pnp:request-items-changed", { detail: { items, requestText } }));
  };

  const toggleRequestItem = value => {
    if (!value) return;
    const items = readItems();
    if (items.includes(value)) {
      writeItems(items.filter(item => item !== value));
    } else {
      items.push(value);
      writeItems(items);
    }
    setStatus(requestStatus, "");
    renderRequest();
  };

  document.addEventListener("click", event => {
    const requestButton = event.target.closest("[data-request-item]");
    if (requestButton) {
      event.preventDefault();
      toggleRequestItem(requestButton.dataset.requestItem);
      return;
    }

    const removeRecent = event.target.closest("[data-catalog-recent-remove]");
    if (!removeRecent) return;
    event.preventDefault();
    writeItems(readItems().filter(item => item !== removeRecent.dataset.catalogRecentRemove));
    renderRequest();
  });

  if (clear) {
    clear.addEventListener("click", () => {
      writeItems([]);
      setStatus(requestStatus, "");
      renderRequest();
    });
  }

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
      link.href = manufacturer.url || manufacturer.site || "#";
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
        const remove = button("catalog-level-selection-remove", "×");
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

  const submitForm = async (form, statusElement, submitButton, options = {}) => {
    const formData = new FormData(form);
    if (options.items) formData.set("items", JSON.stringify(options.items));
    if (options.requestText !== undefined) formData.set("request_text", options.requestText);
    if (!formData.get("source")) formData.set("source", "catalog_request");

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
      return data;
    } catch (error) {
      setStatus(statusElement, error.message || "Не удалось отправить заявку.", true);
      return null;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  };

  if (miniForm) {
    miniForm.addEventListener("submit", async event => {
      event.preventDefault();
      const items = readItems();
      if (!items.length && !output.value.trim()) {
        setStatus(requestStatus, "Добавьте позицию из каталога.", true);
        return;
      }
      const data = await submitForm(miniForm, requestStatus, requestSubmit, {
        items,
        requestText: output.value.trim(),
      });
      if (data) {
        writeItems([]);
        renderRequest();
        if (hiddenItems) hiddenItems.value = "[]";
      }
    });
  }

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
        meta.textContent = `${file.name} · ${formatFileSize(file.size)}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "file-list-remove";
        remove.dataset.fileRemove = String(index);
        remove.setAttribute("aria-label", `Удалить ${file.name}`);
        remove.textContent = "×";

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
    const form = document.querySelector("[data-home-request-transfer]");
    if (!form) return;
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
    const message = form.querySelector("textarea[name='message']");

    const syncContactItems = () => {
      const items = readItems();
      if (hiddenItems) hiddenItems.value = JSON.stringify(items);
      if (!message || !items.length || message.value.trim()) return;
      message.value = formatRequestItems(items);
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

  initVendorFilters();
  initPartnersFilter();
  initCatalogSearch();
  initCatalogLevelNavigator();
  initHomeBrandCarousel();
  initHomeRequestTransfer();
  initContactRequestTransfer();
  initContactCatalogItems();
  renderRequest();
});
