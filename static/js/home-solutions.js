(() => {
  "use strict";
  const root = document.querySelector("[data-home-solutions]");
  if (!root) return;
  const rail = root.querySelector(".home-solutions-rail");
  const cards = [...root.querySelectorAll("[data-solutions-vendor]")];
  const filters = [...root.querySelectorAll("[data-solutions-filter]")];
  const prev = root.querySelector("[data-solutions-prev]");
  const next = root.querySelector("[data-solutions-next]");
  const behavior = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const update = () => {
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
  };
  filters.forEach(button => button.addEventListener("click", () => {
    filters.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    cards.forEach(card => { card.hidden = button.dataset.solutionsFilter !== "all" && card.dataset.solutionsVendor !== button.dataset.solutionsFilter; });
    rail.scrollTo({left: 0, behavior: "instant"});
    update();
  }));
  const move = direction => {
    const card = cards.find(item => !item.hidden);
    if (!card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap);
    rail.scrollBy({left: direction * step, behavior: behavior()});
  };
  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  rail.addEventListener("keydown", event => {
    if (event.target !== rail || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "ArrowRight" ? 1 : -1);
  });
  rail.addEventListener("scroll", update, {passive: true});
  window.addEventListener("resize", update, {passive: true});
  if ("ResizeObserver" in window) new ResizeObserver(update).observe(rail);
  root.querySelector("[data-solutions-controls]").hidden = false;
  update();
})();
