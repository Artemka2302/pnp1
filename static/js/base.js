(function () {
  const body = document.body;
  const header = document.querySelector("[data-site-header]");
  const nav = document.querySelector("[data-main-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const currentYear = document.querySelector("[data-current-year]");

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  function setHeaderState() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  function closeNav() {
    if (!navToggle) return;
    body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  function toggleNav() {
    if (!navToggle) return;
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    body.classList.toggle("nav-open", !isOpen);
    navToggle.setAttribute("aria-expanded", String(!isOpen));
  }

  function markActiveNavItem() {
    if (!nav) return;
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

    nav.querySelectorAll("a[href]").forEach((link) => {
      const url = new URL(link.getAttribute("href"), window.location.origin);
      const linkPath = url.pathname.replace(/\/$/, "") || "/";
      const isActive = currentPath === linkPath;

      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (navToggle) {
    navToggle.addEventListener("click", toggleNav);
  }

  if (nav) {
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeNav();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  document.addEventListener("click", (event) => {
    if (!body.classList.contains("nav-open")) return;
    if (event.target.closest("[data-main-nav]") || event.target.closest("[data-nav-toggle]")) return;
    closeNav();
  });

  window.addEventListener("scroll", setHeaderState, { passive: true });

  setHeaderState();
  markActiveNavItem();
})();
