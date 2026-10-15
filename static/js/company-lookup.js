(() => {
  document.querySelectorAll('[data-company-lookup]').forEach(root => {
    const input = root.querySelector('[name="company"]');
    const token = root.querySelector('[name="company_token"]');
    const list = root.querySelector('[role="listbox"]');
    const status = root.querySelector('[role="status"]');
    const form = input.form;
    let timer, controller, generation = 0, active = -1, choices = [], manual = false;
    const say = text => { status.textContent = text; status.hidden = !text; };
    const close = () => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };
    const validity = () => {
      const allowed = token.value || (manual && /[^\d\s]/.test(input.value));
      input.setCustomValidity(!input.value.trim() || allowed ? '' : 'Выберите компанию из списка по ИНН или названию.');
    };
    const cancel = () => { clearTimeout(timer); controller?.abort(); generation += 1; };
    const choose = index => {
      const item = choices[index];
      if (!item) return;
      cancel();
      input.value = item.name;
      token.value = item.token;
      validity();
      close();
      say('');
      input.focus();
    };
    const highlight = index => {
      active = index;
      [...list.children].forEach((node, i) => node.setAttribute('aria-selected', String(i === active)));
      input.setAttribute('aria-activedescendant', list.children[active].id);
    };
    const search = async () => {
      const query = input.value.trim();
      if (query.length < 3 || token.value) return;
      if (query.length > 100) { say('Для поиска введите ИНН или более короткое название.'); return; }
      const version = generation;
      controller = new AbortController();
      say('Ищем компанию…');
      try {
        const response = await fetch(root.dataset.endpoint, {
          method: 'POST', credentials: 'same-origin', signal: controller.signal,
          headers: {'Content-Type': 'application/json', 'X-CSRFToken': form.querySelector('[name="csrfmiddlewaretoken"]').value},
          body: JSON.stringify({query}),
        });
        const data = await response.json();
        if (version !== generation) return;
        manual = data.manual === true;
        validity();
        if (!response.ok || !data.ok) { say(data.error || 'Поиск временно недоступен. Попробуйте позже.'); return; }
        choices = data.suggestions || [];
        list.replaceChildren();
        choices.forEach((item, index) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'company-suggestion';
          option.id = list.id + '-' + index;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');
          option.tabIndex = -1;
          const name = document.createElement('strong');
          name.textContent = item.name;
          const detail = document.createElement('small');
          detail.textContent = 'ИНН ' + item.inn + (item.address ? ' · ' + item.address : '');
          option.append(name, detail);
          option.addEventListener('mousedown', event => event.preventDefault());
          option.addEventListener('click', () => choose(index));
          list.append(option);
        });
        say(choices.length ? 'Выберите организацию из списка.' : 'Компания не найдена. Проверьте ИНН или уточните название.');
        if (choices.length && document.activeElement === input) {
          list.hidden = false;
          input.setAttribute('aria-expanded', 'true');
        }
      } catch (error) {
        if (version === generation && error.name !== 'AbortError') say('Поиск временно недоступен. Попробуйте позже.');
      }
    };
    input.addEventListener('input', () => {
      cancel(); token.value = ''; choices = []; close(); say(''); validity();
      timer = setTimeout(search, 350);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { cancel(); close(); return; }
      if (list.hidden || !choices.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const down = event.key === 'ArrowDown';
        highlight(active < 0 ? (down ? 0 : choices.length - 1) : (active + (down ? 1 : choices.length - 1)) % choices.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (active >= 0) choose(active); else highlight(0);
      } else if (event.key === 'Tab') close();
    });
    root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) close(); });
    document.addEventListener('click', event => { if (!root.contains(event.target)) close(); });
    form.addEventListener('reset', () => {
      cancel(); token.value = ''; choices = []; close(); say(''); input.setCustomValidity('');
    });
    form.addEventListener('submit', event => {
      validity();
      if (!input.checkValidity()) {
        event.preventDefault(); event.stopImmediatePropagation(); input.reportValidity();
      }
    }, true);
  });
})();
