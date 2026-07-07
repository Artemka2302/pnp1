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
  const buttons = document.querySelectorAll("[data-request-item]");
  const miniForm = document.querySelector("[data-mini-request-form]");
  const requestStatus = document.querySelector("[data-request-status]");
  const requestSubmit = document.querySelector("[data-request-submit]");

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
    buttons.forEach(button => {
      button.classList.toggle("is-selected", items.includes(button.dataset.requestItem));
    });
  };

  const renderRequest = () => {
    const items = readItems();
    if (hiddenItems) hiddenItems.value = JSON.stringify(items);
    syncButtons(items);
    if (!output) return;
    if (!items.length) {
      output.value = "";
      return;
    }
    const groups = new Map();
    for (const item of items) {
      const [system, group, type] = item.split("|");
      const key = `${system}: ${group}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(type);
    }
    const lines = ["Заявка из каталога:"];
    for (const [group, types] of groups) {
      lines.push(`${group}:`);
      for (const type of types) lines.push(`- ${type}`);
    }
    output.value = lines.join("\n");
  };

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.requestItem;
      const items = readItems();
      if (items.includes(value)) {
        writeItems(items.filter(item => item !== value));
      } else {
        items.push(value);
        writeItems(items);
      }
      setStatus(requestStatus, "");
      renderRequest();
    });
  });

  if (clear) {
    clear.addEventListener("click", () => {
      writeItems([]);
      setStatus(requestStatus, "");
      renderRequest();
    });
  }

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

    const writeUrl = url => {
      if (!window.history || !window.history.replaceState) return;
      const currentHash = window.location.hash === "#vendorRowsSection" ? "#vendorRowsSection" : "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}${currentHash}`);
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
        writeUrl(url);
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
      const selectedNames = new Set([...selectedVendors.values()].map(normalizeVendor));
      document.querySelectorAll("[data-vendor-chip]").forEach(chip => {
        const name = chip.dataset.vendorChip || chip.textContent.trim();
        chip.classList.toggle("is-selected", selectedNames.has(normalizeVendor(name)));
      });
    };

    const renderSelectedVendors = () => {
      if (!selectedList) return;
      selectedList.innerHTML = "";
      if (!selectedVendors.size) {
        const empty = document.createElement("span");
        empty.className = "vendor-selected-empty";
        empty.dataset.vendorEmpty = "";
        empty.textContent = "Производители не выбраны";
        selectedList.append(empty);
        syncVendorChipState();
        return;
      }

      for (const [slug, name] of selectedVendors) {
        const chip = document.createElement("span");
        chip.className = "vendor-selected-chip";
        chip.dataset.selectedVendor = slug;
        chip.append(document.createTextNode(name));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.vendorRemove = slug;
        remove.setAttribute("aria-label", `Убрать ${name}`);
        remove.textContent = "×";
        chip.append(remove);

        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = "vendors";
        hidden.value = slug;
        hidden.dataset.vendorHidden = slug;
        chip.append(hidden);
        selectedList.append(chip);
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
      const name = chip.dataset.vendorChip || chip.textContent.trim();
      const vendor = vendorOptions.find(item => item.name === name) || vendorOptions.find(item => normalizeVendor(item.name) === normalizeVendor(name));
      if (vendor) addVendor(vendor.slug, vendor.name);
      else if (search) search.value = name;
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
        if (blockSelect) blockSelect.value = "";
        if (systemSelect) systemSelect.value = "";
        if (groupSelect) groupSelect.value = "";
        if (directionSelect) directionSelect.value = link.dataset.vendorDirectionCard || "";
        syncCustomSelects();
        document.querySelector("#allManufacturers")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    syncVendorChipState();
  };

  initVendorFilters();
  initHomeBrandCarousel();
  initHomeRequestTransfer();
  initContactRequestTransfer();
  renderRequest();
});
