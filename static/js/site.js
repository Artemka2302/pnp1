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

  document.querySelectorAll("[data-lead-form]").forEach(form => {
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("[type='submit']");
    const fileInput = form.querySelector("input[type='file']");
    const fileLabel = form.querySelector("[data-file-label]");
    if (fileInput && fileLabel) {
      fileInput.addEventListener("change", () => {
        const count = fileInput.files.length;
        fileLabel.textContent = count ? `Выбрано файлов: ${count}` : "Прикрепить файл / спецификацию";
      });
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      await submitForm(form, status, submit);
    });
  });

  renderRequest();
});
