document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("is-open"));
  }

  const output = document.querySelector("[data-request-output]");
  const clear = document.querySelector("[data-request-clear]");
  const buttons = document.querySelectorAll("[data-request-item]");

  const storageKey = "pnp_catalog_request_items";

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

  const renderRequest = () => {
    if (!output) return;
    const items = readItems();
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
        button.classList.remove("is-selected");
      } else {
        items.push(value);
        writeItems(items);
        button.classList.add("is-selected");
      }
      renderRequest();
    });
  });

  if (clear) {
    clear.addEventListener("click", () => {
      writeItems([]);
      buttons.forEach(button => button.classList.remove("is-selected"));
      renderRequest();
    });
  }

  renderRequest();
});
