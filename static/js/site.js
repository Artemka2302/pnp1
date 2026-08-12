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
    const csrfToken = form.querySelector("[name='csrfmiddlewaretoken']")?.value
      || getCookie("csrftoken")
      || document.querySelector("[name='csrfmiddlewaretoken']")?.value
      || "";
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;

    if (submitButton) submitButton.disabled = true;
    setStatus(statusElement, form.dataset.submitPending || "Отправляем заявку...");
    try {
      const response = await fetch(form.dataset.requestUrl || form.dataset.leadUrl || form.action, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось отправить заявку.");
      }
      setStatus(
        statusElement,
        form.dataset.submitSuccess || `Заявка #${data.lead_id} сохранена.`,
      );
      form.reset();
      resetFilePicker(form);
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

  const updateFileLabel = (fileLabel, count, emptyLabel = defaultFileLabel) => {
    if (!fileLabel) return;
    if (!count) {
      fileLabel.textContent = emptyLabel;
      return;
    }
    fileLabel.textContent = count === 1 ? "Выбран 1 файл" : `Выбрано файлов: ${count}`;
  };

  const initFilePicker = form => {
    const fileInput = form.querySelector("input[type='file']");
    const fileLabel = form.querySelector("[data-file-label]");
    let fileList = form.querySelector("[data-file-list]");
    if (!fileInput) return;
    const state = {
      files: Array.from(fileInput.files || []),
      initialLabel: fileLabel?.textContent || defaultFileLabel,
      reset: null,
    };
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
      updateFileLabel(fileLabel, files.length, state.initialLabel);
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

    state.reset = () => {
      state.files = [];
      syncFiles();
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

  const resetFilePicker = form => {
    const fileInput = form.querySelector("input[type='file']");
    if (!fileInput) return;
    const state = filePickerState.get(fileInput);
    if (state?.reset) {
      state.reset();
      return;
    }
    fileInput.value = "";
    updateFileLabel(form.querySelector("[data-file-label]"), 0);
    const fileList = form.querySelector("[data-file-list]");
    if (fileList) {
      fileList.innerHTML = "";
      fileList.hidden = true;
    }
  };

  const initSupportChatWidget = () => {
    const leadEndpoint = document.body.dataset.leadEndpoint || "/api/catalog-request/";
    const aiEndpoint = document.body.dataset.aiChatEndpoint || "/api/ai-chat/";
    const liveChatSource = document.body.dataset.bitrixLivechatSrc || "";
    const privacyUrl = document.body.dataset.privacyUrl || "/privacy/";
    const csrfToken = getCookie("csrftoken") || document.querySelector("[name='csrfmiddlewaretoken']")?.value || "";
    const modes = {
      ai: {
        source: "ai_chat",
        label: "AI-помощник",
        title: "Собрать заявку с AI",
        submit: "Отправить заявку",
      },
      manager: {
        source: "contact",
        label: "Менеджер",
        title: "Чат с менеджером",
        submit: "Передать и открыть чат",
      },
    };

    const root = document.createElement("section");
    root.className = "support-chat-widget";
    root.dataset.supportChat = "";
    root.innerHTML = `
      <div class="support-chat-notice" data-manager-chat-notice role="status" aria-live="polite" hidden></div>
      <div class="support-chat-launcher">
        <div class="support-chat-channels" aria-label="Мессенджеры">
          <button class="support-chat-channel" type="button" data-support-channel="max" aria-label="MAX: открыть чат с менеджером" title="MAX">
            <img src="/static/assets/img/messengers/max.svg?v=20260803" alt="" aria-hidden="true">
          </button>
          <button class="support-chat-channel" type="button" data-support-channel="telegram" aria-label="Telegram: открыть чат с менеджером" title="Telegram">
            <img src="/static/assets/img/messengers/telegram.svg?v=20260803" alt="" aria-hidden="true">
          </button>
        </div>
        <button class="support-chat-toggle" type="button" data-support-toggle aria-expanded="false" aria-controls="supportChatPanel">
          <span class="support-chat-toggle-mobile">Помощь</span>
          <span class="support-chat-toggle-desktop" aria-hidden="true">
            <span class="support-chat-toggle-copy"><small>AI-поддержка</small><strong>Помощник по комплектации</strong></span>
            <span class="support-chat-ai-badge">AI</span>
          </span>
        </button>
      </div>
      <div class="support-chat-panel" id="supportChatPanel" data-support-panel hidden role="dialog" aria-label="Быстрая помощь">
        <header class="support-chat-head">
          <div>
            <span class="support-chat-eyebrow" data-support-eyebrow>AI-помощник</span>
            <h2 data-support-title>Собрать заявку с AI</h2>
          </div>
          <button class="support-chat-close" type="button" data-support-close aria-label="Закрыть">×</button>
        </header>
        <div class="support-chat-modes" role="tablist" aria-label="Тип помощи">
          <button class="support-chat-mode is-active" type="button" data-support-mode-option="ai" role="tab">AI-помощник</button>
          <button class="support-chat-mode" type="button" data-support-mode-option="manager" role="tab">Менеджер</button>
        </div>
        <form class="support-chat-form" method="post" action="${leadEndpoint}" data-support-lead-form data-lead-url="${leadEndpoint}" enctype="multipart/form-data" novalidate>
          <input type="hidden" name="csrfmiddlewaretoken" value="${csrfToken}">
          <input type="hidden" name="source" value="ai_chat">
          <input type="hidden" name="direction" value="Комплексная заявка">
          <input type="hidden" name="category" value="Комплексная заявка">
          <input type="hidden" name="object" value="">
          <input type="hidden" name="items" data-request-items value="[]">

          <section class="support-chat-ai" data-support-ai-pane>
            <div class="support-chat-stream" data-ai-messages aria-live="polite">
              <article class="support-chat-message support-chat-message--assistant">
                <span class="support-chat-avatar" aria-hidden="true">AI</span>
                <p>Опишите задачу своими словами. Я уточню важные детали и соберу черновик заявки для менеджера.</p>
              </article>
            </div>
            <div class="support-chat-prompts" aria-label="Быстрые сценарии">
              <button type="button" data-support-prompt="Нужно подобрать материалы по спецификации и предложить аналоги.">Подобрать аналоги</button>
              <button type="button" data-support-prompt="Нужно проверить спецификацию и собрать коммерческое предложение.">Разобрать спецификацию</button>
              <button type="button" data-support-prompt="Нужно уточнить сроки поставки и наличие материалов.">Сроки и наличие</button>
            </div>
            <div class="support-chat-compose">
              <textarea data-ai-input rows="3" maxlength="2000" placeholder="Например: нужны минеральные потолочные панели на объект в Москве, около 800 м²"></textarea>
              <button class="support-chat-send" type="button" data-ai-send>Отправить</button>
            </div>
            <label class="support-chat-consent support-chat-ai-consent">
              <input type="checkbox" name="consent" value="1" data-ai-consent required>
              <span>Я даю согласие на обработку персональных данных в соответствии с <a href="${privacyUrl}" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>.</span>
            </label>
            <p class="support-chat-ai-status" data-ai-status role="status" aria-live="polite"></p>
          </section>

          <section class="support-chat-manager" data-support-manager-pane hidden>
            <div class="support-chat-manager-intro">
              <span class="support-chat-manager-indicator" aria-hidden="true"></span>
              <div>
                <strong>Онлайн-чат отдела продаж</strong>
                <p>Вопрос, выбранные позиции и файлы будут переданы менеджеру до открытия диалога.</p>
              </div>
            </div>
            <button class="support-chat-reopen" type="button" data-manager-reopen hidden>Продолжить текущий чат</button>
            <label class="support-chat-field">
              <span>Сообщение</span>
              <textarea name="message" data-manager-message placeholder="Что нужно подобрать? Укажите объект, город, сроки или приложите файл." required disabled></textarea>
            </label>
          </section>

          <section class="support-chat-final" data-support-final hidden>
            <div class="support-chat-draft" data-ai-draft hidden>
              <div class="support-chat-draft-head">
                <div>
                  <span>Черновик заявки</span>
                  <strong>Проверьте перед отправкой</strong>
                </div>
                <span class="support-chat-draft-state">Можно редактировать</span>
              </div>
              <div class="support-chat-fields">
                <label class="support-chat-field">
                  <span>Направление</span>
                  <input data-ai-draft-direction maxlength="220" placeholder="Комплексная заявка">
                </label>
                <label class="support-chat-field">
                  <span>Объект / город</span>
                  <input data-ai-draft-object maxlength="220" placeholder="Если известно">
                </label>
              </div>
              <label class="support-chat-field">
                <span>Суть заявки</span>
                <textarea name="message" data-ai-draft-message maxlength="5000" required></textarea>
              </label>
              <p class="support-chat-draft-missing" data-ai-draft-missing hidden></p>
            </div>

            <div class="support-chat-section-label">Контакт для ответа</div>
            <div class="support-chat-fields">
              <label class="support-chat-field">
                <span>Имя / компания</span>
                <input name="name" autocomplete="name" placeholder="Как к вам обращаться">
              </label>
              <label class="support-chat-field">
                <span>Телефон</span>
                <input name="phone" type="tel" inputmode="tel" maxlength="18" data-phone-input autocomplete="tel" placeholder="+7 ___ ___-__-__" required>
              </label>
            </div>
            <div class="support-chat-selected" data-contact-request-items hidden>
              <div class="support-chat-selected-head">
                <b>Выбрано из каталога: <span data-request-count>0</span></b>
                <button type="button" data-request-clear>Очистить</button>
              </div>
              <div class="support-chat-selected-list" data-request-list></div>
            </div>
            <div class="support-chat-file file-field">
              <label class="support-chat-upload" for="supportChatFile">
                <span data-file-label>Прикрепить файл / спецификацию</span>
                <small>PDF, DOC, XLS, DWG, JPG, PNG, ZIP до 30 МБ</small>
              </label>
              <input class="file-input" id="supportChatFile" name="specification" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png,.zip" multiple>
              <div class="file-list" data-file-list hidden></div>
            </div>
            <label class="support-chat-consent form-consent-check" data-manager-consent-label hidden>
              <input type="checkbox" name="consent" value="1" data-manager-consent required disabled>
              <span>Я даю согласие на обработку персональных данных в соответствии с <a href="${privacyUrl}" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</a>.</span>
            </label>
            <button class="support-chat-submit" type="submit" data-support-submit>Отправить заявку</button>
            <p class="form-status support-chat-status" data-form-status role="status" aria-live="polite"></p>
          </section>
        </form>
      </div>
    `;
    document.body.append(root);

    const toggle = root.querySelector("[data-support-toggle]");
    const panel = root.querySelector("[data-support-panel]");
    const closeButton = root.querySelector("[data-support-close]");
    const title = root.querySelector("[data-support-title]");
    const eyebrow = root.querySelector("[data-support-eyebrow]");
    const form = root.querySelector("[data-support-lead-form]");
    const aiPane = root.querySelector("[data-support-ai-pane]");
    const managerPane = root.querySelector("[data-support-manager-pane]");
    const finalSection = root.querySelector("[data-support-final]");
    const draftCard = root.querySelector("[data-ai-draft]");
    const draftDirection = root.querySelector("[data-ai-draft-direction]");
    const draftObject = root.querySelector("[data-ai-draft-object]");
    const draftMessage = root.querySelector("[data-ai-draft-message]");
    const draftMissing = root.querySelector("[data-ai-draft-missing]");
    const managerMessage = root.querySelector("[data-manager-message]");
    const managerReopen = root.querySelector("[data-manager-reopen]");
    const managerChatNotice = root.querySelector("[data-manager-chat-notice]");
    const managerConsent = root.querySelector("[data-manager-consent]");
    const managerConsentLabel = root.querySelector("[data-manager-consent-label]");
    const aiConsent = root.querySelector("[data-ai-consent]");
    const aiInput = root.querySelector("[data-ai-input]");
    const aiSend = root.querySelector("[data-ai-send]");
    const aiMessages = root.querySelector("[data-ai-messages]");
    const aiStatus = root.querySelector("[data-ai-status]");
    const status = root.querySelector("[data-form-status]");
    const submit = root.querySelector("[data-support-submit]");
    const sourceInput = form.elements.source;
    const directionInput = form.elements.direction;
    const categoryInput = form.elements.category;
    const objectInput = form.elements.object;
    const modeButtons = Array.from(root.querySelectorAll("[data-support-mode-option]"));
    let currentMode = "ai";
    let aiPending = false;
    let latestLeadDraft = null;
    let history = [];
    let bitrixLiveChatWidget = null;
    let bitrixScriptPromise = null;
    let pendingManagerChatContext = null;
    let lastManagerChatContext = null;
    let managerChatNoticeTimer = null;
    const configuredLiveChatWidgets = new WeakSet();
    const configuringLiveChatWidgets = new WeakSet();

    const showManagerChatNotice = message => {
      if (!managerChatNotice) return;
      window.clearTimeout(managerChatNoticeTimer);
      managerChatNotice.textContent = message;
      managerChatNotice.hidden = false;
      managerChatNoticeTimer = window.setTimeout(() => {
        managerChatNotice.hidden = true;
      }, 6000);
    };

    const cleanLiveChatValue = (value, maxLength = 500) => String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);

    const normalizedLiveChatSource = () => {
      if (!liveChatSource) return "";
      try {
        const url = new URL(liveChatSource, window.location.href);
        return url.protocol === "https:" ? url.href : "";
      } catch {
        return "";
      }
    };

    const buildBitrixLiveChatData = context => {
      const catalogItems = cleanLiveChatValue(formatRequestItems(context.items || []), 900);
      const fileNames = (context.files || [])
        .map(fileName => cleanLiveChatValue(fileName, 160))
        .filter(Boolean)
        .join(", ");
      const pageUrl = `${window.location.origin}${window.location.pathname}`;
      const rows = [
        ["Канал", "Чат с менеджером на сайте"],
        ["Заявка на сайте", context.leadId ? `#${context.leadId}` : ""],
        ["Телефон", context.phone],
        ["Вопрос", context.message],
        ["Позиции каталога", catalogItems],
        ["Файлы", fileNames],
        ["Страница", pageUrl],
      ].filter(([, value]) => cleanLiveChatValue(value));
      const customData = [];
      const name = cleanLiveChatValue(context.name, 120);
      if (name) customData.push({ USER: { NAME: name } });
      if (rows.length) {
        customData.push({
          GRID: rows.map(([nameValue, value]) => ({
            NAME: nameValue,
            VALUE: cleanLiveChatValue(value, nameValue === "Вопрос" || nameValue === "Позиции каталога" ? 900 : 220),
            DISPLAY: "LINE",
          })),
        });
      }
      return customData;
    };

    const localizeBitrixLiveChat = widget => {
      if (typeof widget?.addLocalize !== "function") return;
      try {
        widget.addLocalize({
          BX_LIVECHAT_LOADING: "Подключаем чат с менеджером...",
          BX_LIVECHAT_TITLE: "Чат с менеджером ПНП",
          BX_LIVECHAT_USER: "менеджер",
          BX_LIVECHAT_OFFLINE_TITLE: "Оставьте сообщение для менеджера",
          BX_LIVECHAT_ERROR_TITLE: "Не удалось подключить чат",
          BX_LIVECHAT_ERROR_DESC: "Попробуйте открыть чат ещё раз или свяжитесь с нами по телефону.",
          BX_MESSENGER_TEXTAREA_PLACEHOLDER: "Напишите сообщение менеджеру...",
        });
      } catch {
        // Bitrix can reject localization until its configuration is loaded.
      }
    };

    const subscribeToBitrixLiveChat = widget => {
      if (!widget || configuredLiveChatWidgets.has(widget) || configuringLiveChatWidgets.has(widget)) return;
      configuringLiveChatWidgets.add(widget);

      const subscribe = attemptsLeft => {
        const subscriptionTypes = window.BX?.LiveChatWidget?.SubscriptionType || {
          configLoaded: "configLoaded",
          sessionFinish: "sessionFinish",
        };
        if (typeof widget.subscribe !== "function") {
          if (attemptsLeft > 0) {
            window.setTimeout(() => subscribe(attemptsLeft - 1), 250);
          } else {
            configuringLiveChatWidgets.delete(widget);
          }
          return;
        }

        configuringLiveChatWidgets.delete(widget);
        configuredLiveChatWidgets.add(widget);

        const safelySubscribe = (type, callback) => {
          if (!type) return;
          try {
            widget.subscribe({ type, callback });
          } catch {
            // The chat itself remains available if an optional event is unavailable.
          }
        };

        safelySubscribe(subscriptionTypes.configLoaded, () => {
          localizeBitrixLiveChat(widget);
          if (!pendingManagerChatContext || typeof widget.open !== "function") return;
          try {
            widget.open();
          } catch {
            // The immediate open attempt remains the fallback.
          }
        });

        safelySubscribe(subscriptionTypes.sessionFinish, () => {
          pendingManagerChatContext = null;
          lastManagerChatContext = null;
          managerReopen.hidden = true;
          if (typeof widget.close === "function") {
            try {
              widget.close();
            } catch {
              // The session is already finished; only the visual state remains.
            }
          }
          showManagerChatNotice("Диалог завершён менеджером.");
        });
      };

      try {
        subscribe(20);
      } catch {
        configuringLiveChatWidgets.delete(widget);
        // Opening the official widget does not depend on event subscriptions.
      }
    };

    const configureBitrixLiveChat = (widget, context) => {
      if (!widget) return;
      const customData = buildBitrixLiveChatData(context || {});
      if (customData.length && typeof widget.setCustomData === "function") {
        try {
          widget.setCustomData(customData);
        } catch {
          // The lead is already saved; chat can still open without extra context.
        }
      }
      localizeBitrixLiveChat(widget);
      subscribeToBitrixLiveChat(widget);
    };

    window.addEventListener("onBitrixLiveChat", event => {
      const widget = event?.detail?.widget;
      if (!widget) return;
      bitrixLiveChatWidget = widget;
      configureBitrixLiveChat(widget, pendingManagerChatContext);
    });

    const waitForBitrixLiveChatWidget = (timeout = 6000) => {
      if (bitrixLiveChatWidget) return Promise.resolve(bitrixLiveChatWidget);
      return new Promise(resolve => {
        let timeoutId;
        const handleReady = event => {
          const widget = event?.detail?.widget;
          if (!widget) return;
          window.removeEventListener("onBitrixLiveChat", handleReady);
          clearTimeout(timeoutId);
          resolve(widget);
        };
        window.addEventListener("onBitrixLiveChat", handleReady);
        timeoutId = window.setTimeout(() => {
          window.removeEventListener("onBitrixLiveChat", handleReady);
          resolve(bitrixLiveChatWidget);
        }, timeout);
      });
    };

    const loadBitrixLiveChat = async () => {
      if (bitrixLiveChatWidget) return bitrixLiveChatWidget;
      const source = normalizedLiveChatSource();
      if (!source) return null;
      const sourceUrl = new URL(source);
      const existingScript = Array.from(document.scripts).find(script => {
        if (!script.src) return false;
        try {
          const scriptUrl = new URL(script.src);
          return scriptUrl.origin === sourceUrl.origin && scriptUrl.pathname === sourceUrl.pathname;
        } catch {
          return false;
        }
      });
      if (!existingScript && !bitrixScriptPromise) {
        bitrixScriptPromise = new Promise(resolve => {
          const script = document.createElement("script");
          let settled = false;
          const finish = loaded => {
            if (settled) return;
            settled = true;
            resolve(loaded);
          };
          script.async = true;
          script.src = `${source}${source.includes("?") ? "&" : "?"}${Math.floor(Date.now() / 60000)}`;
          script.dataset.pnpBitrixLivechat = "";
          script.referrerPolicy = "strict-origin-when-cross-origin";
          script.addEventListener("load", () => finish(true), { once: true });
          script.addEventListener("error", () => finish(false), { once: true });
          document.head.append(script);
          window.setTimeout(() => finish(false), 6000);
        });
      }
      if (bitrixScriptPromise) await bitrixScriptPromise;
      return waitForBitrixLiveChatWidget();
    };

    const openManagerLiveChat = async context => {
      pendingManagerChatContext = context;
      const widget = await loadBitrixLiveChat();
      if (widget) {
        configureBitrixLiveChat(widget, context);
        if (typeof widget.open === "function") {
          try {
            widget.open();
            return true;
          } catch {
            // Fall through to the legacy public API exposed by some loaders.
          }
        }
      }
      const liveChatApi = window.BX?.LiveChat || window.BX?.Livechat;
      if (typeof liveChatApi?.openLiveChat !== "function") return false;
      try {
        liveChatApi.openLiveChat();
        return true;
      } catch {
        return false;
      }
    };

    const launchManagerLiveChat = async trigger => {
      if (trigger) trigger.disabled = true;
      setStatus(status, "Открываем чат с менеджером...");
      const opened = await openManagerLiveChat({ items: readItems() });
      if (trigger) trigger.disabled = false;
      if (opened) {
        setStatus(status, "Чат с менеджером открыт.");
        setOpen(false);
        return;
      }

      setMode("manager");
      setOpen(true);
      setStatus(status, "Онлайн-чат сейчас недоступен. Оставьте контакты, и менеджер свяжется с вами.", true);
    };

    const cleanDraftValue = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

    const normalizeLeadDraft = value => {
      if (!value || typeof value !== "object") return null;
      const messageValue = cleanDraftValue(value.message || value.summary || value.request_text, 5000);
      const categoryValue = cleanDraftValue(value.category || value.direction, 220);
      const objectValue = cleanDraftValue(value.object_name || value.object || value.city, 220);
      if (!messageValue && !categoryValue && !objectValue) return null;
      const rawMissing = Array.isArray(value.missing_fields)
        ? value.missing_fields
        : Array.isArray(value.missingFields) ? value.missingFields : [];
      return {
        direction: cleanDraftValue(value.direction || categoryValue || "Комплексная заявка", 220),
        category: categoryValue || "Комплексная заявка",
        object: objectValue,
        message: messageValue,
        missingFields: rawMissing.map(item => cleanDraftValue(item, 80)).filter(Boolean).slice(0, 6),
      };
    };

    const addAiMessage = (content, role) => {
      const text = cleanDraftValue(content, 2200);
      if (!text) return;
      const article = document.createElement("article");
      article.className = `support-chat-message support-chat-message--${role}`;
      const avatar = document.createElement("span");
      avatar.className = "support-chat-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = role === "user" ? "Вы" : "AI";
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      article.append(avatar, paragraph);
      aiMessages.append(article);
      aiMessages.scrollTop = aiMessages.scrollHeight;
    };

    const setAiPending = pending => {
      aiPending = pending;
      aiSend.disabled = pending;
      aiInput.disabled = pending;
      aiSend.textContent = pending ? "Думаю..." : "Отправить";
      root.classList.toggle("is-ai-pending", pending);
    };

    const renderLeadDraft = value => {
      const normalized = normalizeLeadDraft(value);
      if (!normalized) return;
      latestLeadDraft = normalized;
      draftDirection.value = normalized.direction;
      draftObject.value = normalized.object;
      draftMessage.value = normalized.message;
      draftMissing.textContent = normalized.missingFields.length
        ? `Для точного КП можно уточнить: ${normalized.missingFields.join(", ")}.`
        : "";
      draftMissing.hidden = !normalized.missingFields.length;
      draftCard.hidden = false;
      if (currentMode === "ai") finalSection.hidden = false;
    };

    const sendAiMessage = async () => {
      const userMessage = aiInput.value.trim();
      if (!userMessage || aiPending) return;
      if (!aiConsent.checked) {
        setStatus(aiStatus, "Подтвердите согласие перед отправкой сообщения.", true);
        aiConsent.focus();
        return;
      }

      const requestHistory = history.slice(-10);
      addAiMessage(userMessage, "user");
      aiInput.value = "";
      setStatus(aiStatus, "AI анализирует задачу...");
      setAiPending(true);

      const headers = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };
      if (csrfToken) headers["X-CSRFToken"] = csrfToken;

      try {
        const response = await fetch(aiEndpoint, {
          method: "POST",
          credentials: "same-origin",
          headers,
          body: JSON.stringify({
            message: userMessage,
            consent: aiConsent.checked,
            history: requestHistory,
            lead_draft: latestLeadDraft,
            catalog_items: readItems(),
            page: window.location.pathname,
          }),
        });
        const data = await response.json().catch(() => ({}));
        const answer = cleanDraftValue(data.answer, 2200);
        if (answer) addAiMessage(answer, "assistant");
        renderLeadDraft(data.lead_draft || data.leadDraft);
        if (!response.ok) {
          throw new Error(data.error_message || (response.status === 429
            ? "Слишком много сообщений подряд. Попробуйте немного позже."
            : "AI-помощник сейчас недоступен. Можно перейти во вкладку «Менеджер»."));
        }
        if (!answer) throw new Error("AI не вернул ответ. Попробуйте сформулировать запрос ещё раз.");
        history = [
          ...requestHistory,
          { role: "user", content: userMessage },
          { role: "assistant", content: answer },
        ].slice(-12);
        setStatus(aiStatus, latestLeadDraft ? "Черновик заявки обновлён." : "");
      } catch (error) {
        setStatus(aiStatus, error.message || "AI-помощник сейчас недоступен.", true);
      } finally {
        setAiPending(false);
        aiInput.focus();
      }
    };

    const setMode = mode => {
      currentMode = modes[mode] ? mode : "manager";
      const meta = modes[currentMode];
      sourceInput.value = meta.source;
      title.textContent = meta.title;
      eyebrow.textContent = meta.label;
      submit.textContent = meta.submit;
      const isAi = currentMode === "ai";
      aiPane.hidden = !isAi;
      managerPane.hidden = isAi;
      managerMessage.disabled = isAi;
      draftMessage.disabled = !isAi;
      aiConsent.disabled = !isAi;
      managerConsent.disabled = isAi;
      managerConsentLabel.hidden = isAi;
      draftCard.hidden = !isAi || !latestLeadDraft;
      finalSection.hidden = isAi && !latestLeadDraft;
      if (isAi && latestLeadDraft) renderLeadDraft(latestLeadDraft);
      if (!isAi) {
        directionInput.value = "Быстрая помощь";
        categoryInput.value = "Менеджер";
        objectInput.value = "";
      }
      modeButtons.forEach(button => {
        const active = button.dataset.supportModeOption === currentMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
    };

    const setOpen = isOpen => {
      panel.hidden = !isOpen;
      root.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) setTimeout(() => (currentMode === "ai" ? aiInput : managerMessage).focus(), 60);
    };

    toggle.addEventListener("click", () => setOpen(panel.hidden));
    closeButton.addEventListener("click", () => setOpen(false));
    root.querySelectorAll("[data-support-channel]").forEach(button => {
      button.addEventListener("click", () => launchManagerLiveChat(button));
    });
    modeButtons.forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.supportModeOption === "manager") {
          launchManagerLiveChat(button);
          return;
        }
        setMode(button.dataset.supportModeOption);
      });
    });
    root.querySelectorAll("[data-support-prompt]").forEach(button => {
      button.addEventListener("click", () => {
        aiInput.value = button.dataset.supportPrompt || "";
        aiInput.focus();
      });
    });
    aiSend.addEventListener("click", sendAiMessage);
    aiInput.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      sendAiMessage();
    });
    managerReopen.addEventListener("click", async () => {
      if (!lastManagerChatContext) return;
      managerReopen.disabled = true;
      setStatus(status, "Открываем чат с менеджером...");
      const opened = await openManagerLiveChat(lastManagerChatContext);
      managerReopen.disabled = false;
      if (opened) {
        setStatus(status, "Чат с менеджером открыт.");
        setOpen(false);
      } else {
        setStatus(status, "Чат сейчас недоступен. Менеджер ответит по указанному телефону.", true);
      }
    });
    aiConsent.addEventListener("change", () => setStatus(aiStatus, ""));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
    document.querySelectorAll("[data-footer-ai-button]").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.footerAiMode === "manager") {
          launchManagerLiveChat(button);
          return;
        }
        setMode(button.dataset.footerAiMode);
        setOpen(true);
      });
    });

    initFilePicker(form);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submittedMode = currentMode;
      if (submittedMode === "ai" && !latestLeadDraft) {
        setStatus(aiStatus, "Сначала опишите задачу, чтобы AI собрал черновик заявки.", true);
        return;
      }
      const items = readItems();
      const modeLabel = modes[submittedMode].label;
      const managerContext = submittedMode === "manager" ? {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        message: managerMessage.value,
        items: [...items],
        files: Array.from(form.querySelector("input[type='file']")?.files || []).map(file => file.name),
      } : null;
      if (submittedMode === "ai") {
        latestLeadDraft = normalizeLeadDraft({
          ...latestLeadDraft,
          direction: draftDirection.value,
          category: draftDirection.value,
          object: draftObject.value,
          message: draftMessage.value,
        });
        directionInput.value = latestLeadDraft?.direction || "Комплексная заявка";
        categoryInput.value = latestLeadDraft?.category || directionInput.value;
        objectInput.value = latestLeadDraft?.object || "";
      } else {
        directionInput.value = "Быстрая помощь";
        categoryInput.value = "Менеджер";
        objectInput.value = "";
      }
      const requestText = [
        `Канал обращения: ${modeLabel}`,
        formatRequestItems(items),
      ].filter(Boolean).join("\n\n");
      modeButtons.forEach(button => { button.disabled = true; });
      const data = await submitForm(form, status, submit, { items, requestText });
      if (data) {
        if (submittedMode === "ai") {
          addAiMessage(`Заявка #${data.lead_id} отправлена. Менеджер получил собранный запрос и прикреплённые файлы.`, "assistant");
          latestLeadDraft = null;
          history = [];
          draftCard.hidden = true;
          finalSection.hidden = true;
          aiConsent.checked = false;
        } else {
          lastManagerChatContext = { ...managerContext, leadId: data.lead_id };
          setStatus(status, "Заявка сохранена. Открываем чат с менеджером...");
          const opened = await openManagerLiveChat(lastManagerChatContext);
          managerReopen.hidden = !opened;
          if (opened) {
            const sentText = data.bitrix_sent
              ? `Заявка #${data.lead_id} передана в Bitrix. Чат открыт.`
              : `Заявка #${data.lead_id} сохранена. Чат открыт.`;
            setStatus(status, sentText);
            if (currentMode === "manager") setOpen(false);
          } else {
            setStatus(status, `Заявка #${data.lead_id} сохранена. Чат сейчас недоступен; менеджер свяжется по телефону.`, true);
          }
        }
        setMode(currentMode);
      }
      modeButtons.forEach(button => { button.disabled = false; });
    });

    setMode(currentMode);
    loadBitrixLiveChat();
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

  const initSupportWidgetFormVisibility = () => {
    const supportWidget = document.querySelector("[data-support-chat]");
    const requestForms = [...document.querySelectorAll("[data-contact-request-switcher]")];
    if (!supportWidget || !requestForms.length || !("IntersectionObserver" in window)) return;

    const visibleForms = new Set();
    const syncVisibility = () => {
      document.body.classList.toggle("request-form-in-view", visibleForms.size > 0);
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleForms.add(entry.target);
        else visibleForms.delete(entry.target);
      });
      syncVisibility();
    }, { threshold: 0.15 });

    requestForms.forEach(form => observer.observe(form));
  };

  const initContactRequestSwitcher = () => {
    document.querySelectorAll("[data-contact-request-switcher]").forEach(root => {
      const tabs = [...root.querySelectorAll("[data-contact-request-tab]")];
      const panels = [...root.querySelectorAll("[data-contact-request-panel]")];
      if (tabs.length < 2 || panels.length < 2) return;

      const activate = (mode, focus = false) => {
        const activeTab = tabs.find(tab => tab.dataset.contactRequestTab === mode);
        const activePanel = panels.find(panel => panel.dataset.contactRequestPanel === mode);
        if (!activeTab || !activePanel) return;

        tabs.forEach(tab => {
          const isActive = tab === activeTab;
          tab.classList.toggle("is-active", isActive);
          tab.setAttribute("aria-selected", String(isActive));
          tab.tabIndex = isActive ? 0 : -1;
        });
        panels.forEach(panel => {
          panel.hidden = panel !== activePanel;
        });
        if (focus) activeTab.focus();
      };

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activate(tab.dataset.contactRequestTab));
        tab.addEventListener("keydown", event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          let nextIndex = index;
          if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = tabs.length - 1;
          activate(tabs[nextIndex].dataset.contactRequestTab, true);
        });
      });

      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("form") === "cooperation" || window.location.hash === "#cooperation-form"
        ? "cooperation"
        : "supply";
      activate(requestedMode);
    });
  };

  initContactRequestSwitcher();

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

    const form = document.querySelector("[data-lead-form][data-request-mode='supply']");
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
    const form = document.querySelector("[data-lead-form][data-request-mode='supply']");
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

  initVendorFilters();
  initPartnersFilter();
  initHomeBrandCarousel();
  initHomeDesktopExperience();
  initHomeRequestTransfer();
  initContactRequestTransfer();
  initContactCatalogItems();
  initSupportChatWidget();
  initSupportWidgetFormVisibility();
  initPhoneInputs();
  initCookieConsent();
  renderRequest();
});
