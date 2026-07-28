(() => {
  "use strict";

  const desktop = window.matchMedia("(min-width: 1081px)");
  if (!desktop.matches || !document.body.classList.contains("pnp-live-home")) return;

  const supplyIcons = {
    architecture: '<path d="M4 20h16M6 20V8l6-4 6 4v12M9 20v-5h6v5M9 10h.01M15 10h.01"/>',
    constructive: '<path d="M4 5h16v14H4zM4 10h16M9 5v5m6-5v5M8 14h8"/>',
    "landscaping-and-site-improvement": '<path d="M12 21v-8M12 13c-4 0-7-2.4-7-6 4 0 7 2.4 7 6Zm0 2c4 0 7-2.4 7-6-4 0-7 2.4-7 6Z"/>',
    water: '<path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Zm-3 12a3.2 3.2 0 0 0 3 2"/>',
    hvac: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 2 3-2M9 19l3-2 3 2"/>',
    fire: '<path d="M12 3c1 4-2 5-2 8 0 1.7 1 2.8 2.4 2.8 2.2 0 3.6-2.2 2.8-4.8 2.4 2 3.8 4.4 3.2 7a6.6 6.6 0 0 1-12.8 0C4.6 12 7 8.5 12 3Z"/>',
    "low-current": '<path d="M4 6h16v11H4zM8 21h8M12 17v4M7 10h2m2 0h6M7 13h4"/>',
    gas: '<path d="M7 20h10M9 20V9h6v11M10 9V5a2 2 0 0 1 4 0v4M8 13h8"/>',
    "vertical-transport": '<path d="M6 3h12v18H6zM9 8l3-3 3 3M9 16l3 3 3-3M12 5v14"/>',
    accessibility: '<circle cx="12" cy="5" r="2"/><path d="M10 8h4l1 5h3M10 9l-2 5h4l2 6M8 14a5 5 0 1 0 7 4"/>',
    eom: '<path d="m13 2-8 12h6l-1 8 9-13h-6V2Z"/>',
    "ev-charging-infrastructure": '<path d="M7 4h8v16H7zM10 8h2m-2 4h2m5-4h2v6a2 2 0 0 1-2 2h-2M9 20h4"/>',
    "it-infrastructure": '<path d="M4 5h16v5H4zM4 14h16v5H4zM7 8h.01M7 17h.01M11 8h6M11 17h6"/>',
    "tech-equipment": '<circle cx="12" cy="12" r="3"/><path d="M19 12a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 5.9a8 8 0 0 0-1.7 1L5 6 3 9.5 5 11a7.5 7.5 0 0 0 0 2l-2 1.5L5 18l2.3-1a8 8 0 0 0 1.7 1l.5 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z"/>'
  };

  const initAdvantages = () => {
    const root = document.querySelector("[data-pnp-live-why]");
    if (!root) return;
    const cards = [...root.querySelectorAll(".why-tech-card")];
    const label = root.querySelector("[data-live-why-label]");
    const title = root.querySelector("[data-live-why-title]");
    const text = root.querySelector("[data-live-why-text]");
    const activate = card => {
      cards.forEach(item => item.classList.toggle("is-active", item === card));
      if (label) label.textContent = card.dataset.label || "";
      if (title) title.textContent = card.querySelector("h3")?.textContent || "";
      if (text) text.textContent = card.querySelector(".why-tech-card__detail p")?.textContent || "";
    };
    cards.forEach(card => {
      card.addEventListener("mouseenter", () => activate(card));
      card.addEventListener("focus", () => activate(card));
      card.addEventListener("click", () => activate(card));
      card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate(card);
      });
    });
    if (cards[0]) activate(cards[0]);
  };

  const initSupplyMap = () => {
    const root = document.querySelector("[data-pnp-live-supply]");
    if (!root) return;
    const links = [...root.querySelectorAll("[data-live-supply-direction]")];
    links.forEach(link => {
      const icon = link.querySelector("[data-live-supply-icon]");
      const path = supplyIcons[link.dataset.liveSupplyDirection] || supplyIcons["tech-equipment"];
      if (icon) icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
    });
  };

  const initPartnerLogoCarousel = () => {
    document.querySelectorAll("[data-partner-logo-carousel]").forEach(root => {
      if (root.dataset.partnerCarouselReady === "true") return;
      const track = root.querySelector(".partner-logo-showcase");
      const prev = root.querySelector("[data-partner-logo-prev]");
      const next = root.querySelector("[data-partner-logo-next]");
      if (!track || !prev || !next) return;
      root.dataset.partnerCarouselReady = "true";

      const update = () => {
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
        const atStart = track.scrollLeft <= 4;
        const atEnd = track.scrollLeft >= maxScroll;
        const canScroll = maxScroll > 0;
        root.classList.toggle("is-at-start", atStart || !canScroll);
        root.classList.toggle("is-at-end", atEnd || !canScroll);
        root.classList.toggle("is-scrollable", canScroll);
        prev.disabled = atStart || !canScroll;
        next.disabled = atEnd || !canScroll;
        prev.hidden = !canScroll;
        next.hidden = !canScroll;
      };
      const step = () => Math.max(300, Math.floor(track.clientWidth * 0.72));
      prev.addEventListener("click", event => {
        event.preventDefault();
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
      next.addEventListener("click", event => {
        event.preventDefault();
        track.scrollBy({ left: step(), behavior: "smooth" });
      });
      track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
      window.addEventListener("resize", () => requestAnimationFrame(update), { passive: true });
      requestAnimationFrame(update);
      window.setTimeout(update, 500);
    });
  };

  const workflowSteps = {
    project: {
      eyebrow: "01 · Проект",
      title: "Разбираем проектную задачу",
      description: "Изучаем спецификацию, раздел проекта и данные об объекте, чтобы зафиксировать требования для подбора.",
      tags: ["Раздел проекта", "Позиции и количество", "Объект и город поставки"],
      image: "/static/assets/img/complectation/project.webp"
    },
    analogs: {
      eyebrow: "02 · Аналоги",
      title: "Формируем варианты замены",
      description: "Сопоставляем варианты по переданным параметрам; применимость подтверждает специалист после проверки.",
      tags: ["Ключевые характеристики", "Документы по запросу", "Проверка применимости"],
      image: "/static/assets/img/complectation/analogs.webp"
    },
    control: {
      eyebrow: "03 · Контроль",
      title: "Сохраняем единый контекст",
      description: "Фиксируем позиции, изменения, открытые вопросы и подтверждённые условия в одной заявке.",
      tags: ["Позиции и версии", "Открытые вопросы", "Подтверждённые условия"],
      image: "/static/assets/img/complectation/control.webp"
    },
    delivery: {
      eyebrow: "04 · Поставка",
      title: "Согласовываем условия поставки",
      description: "После выбора позиций уточняем состав, документы и условия отгрузки по заявке.",
      tags: ["Согласованный состав", "Документы по позициям", "Условия отгрузки"],
      image: "/static/assets/img/complectation/delivery.webp"
    }
  };

  const initWorkflow = () => {
    const root = document.querySelector("[data-pnp-live-workflow]");
    if (!root) return;
    if (root.dataset.homeRequestWorkflowReady === "true") return;
    const tabs = [...root.querySelectorAll("[data-home-request-step]")];
    const panel = root.querySelector("[data-home-request-panel]");
    const layers = [...root.querySelectorAll("[data-home-request-bg-layer]")];
    const eyebrow = root.querySelector("[data-home-request-eyebrow]");
    const title = root.querySelector("[data-home-request-title]");
    const description = root.querySelector("[data-home-request-description]");
    const tags = root.querySelector("[data-home-request-tags]");
    const process = root.querySelector("[data-home-request-process]");
    const rail = root.querySelector(".home-request-stage-rail");
    const fill = root.querySelector("[data-home-request-track-fill]");
    const runner = root.querySelector("[data-home-request-runner]");
    if (!tabs.length || !panel || layers.length !== 2 || !eyebrow || !title || !description || !tags || !process || !rail || !fill || !runner) return;

    const validKeys = new Set(tabs.map(tab => tab.dataset.homeRequestStep).filter(key => workflowSteps[key]));
    const fallbackKey = tabs[0].dataset.homeRequestStep;
    let committedKey = validKeys.has(root.dataset.defaultStep) ? root.dataset.defaultStep : fallbackKey;
    let activeLayer = 0;
    let contentRequest = 0;
    let backgroundRequest = 0;
    let contentTimer = 0;
    let waitTimer = 0;
    let waitStartedAt = 0;
    let waitRemaining = 0;
    let waitCallback = null;
    let motionAnimations = [];
    let motionToken = 0;
    let manualResumeTimer = 0;
    let resizeFrame = 0;
    const pauseReasons = new Set(["offscreen"]);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DWELL_MS = 3000;
    const TRAVEL_MS = 3000;
    const CAPTURE_MS = 520;
    const CONTENT_SWAP_MS = 260;
    const END_HOLD_MS = 4000;
    const RESET_FADE_MS = 220;
    const RESET_REVEAL_MS = 260;
    const MANUAL_HOLD_MS = 8000;

    const preloadedImages = new Map(Object.values(workflowSteps).map(step => {
      const ready = new Promise(resolve => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = step.image;
        if (image.complete) resolve(image.naturalWidth > 0);
      });
      return [step.image, ready];
    }));
    Promise.all(preloadedImages.values()).then(results => {
      root.dataset.homeRequestImagesReady = String(results.every(Boolean));
    });

    const progressRatio = index => tabs.length > 1 ? index / (tabs.length - 1) : 0;
    const runnerTransform = index => {
      const distance = Math.max(0, rail.getBoundingClientRect().width * progressRatio(index));
      return `translate(-50%, -50%) translateX(${distance}px)`;
    };
    const setProgress = index => {
      const ratio = progressRatio(index);
      fill.style.transform = `scaleX(${ratio})`;
      runner.style.transform = runnerTransform(index);
      tabs.forEach((tab, tabIndex) => tab.classList.toggle("is-complete", tabIndex < index));
      root.style.setProperty("--home-request-progress", String(ratio * 100));
    };

    const renderContent = (step, activeTab, immediate = false) => {
      const request = ++contentRequest;
      window.clearTimeout(contentTimer);
      const apply = () => {
        if (request !== contentRequest) return;
        eyebrow.textContent = step.eyebrow;
        title.textContent = step.title;
        description.textContent = step.description;
        tags.replaceChildren(...step.tags.map(value => {
          const item = document.createElement("li");
          item.textContent = value;
          return item;
        }));
        panel.dataset.homeRequestPanel = activeTab.dataset.homeRequestStep;
        panel.setAttribute("aria-labelledby", activeTab.id);
        panel.setAttribute("aria-hidden", "false");
        panel.classList.remove("is-changing");
      };
      if (immediate) {
        apply();
        return;
      }
      panel.classList.add("is-changing");
      contentTimer = window.setTimeout(apply, CONTENT_SWAP_MS);
    };

    const renderBackground = (step, immediate = false) => {
      const request = ++backgroundRequest;
      const currentLayer = layers[activeLayer];
      const nextIndex = immediate ? activeLayer : 1 - activeLayer;
      const nextLayer = layers[nextIndex];
      const apply = ready => {
        if (request !== backgroundRequest || (!ready && !immediate)) return;
        nextLayer.style.backgroundImage = `url("${step.image}")`;
        if (immediate) {
          nextLayer.classList.add("is-active");
          return;
        }
        nextLayer.classList.remove("is-active");
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (request !== backgroundRequest) return;
          nextLayer.classList.add("is-active");
          currentLayer.classList.remove("is-active");
          activeLayer = nextIndex;
        }));
      };
      if (immediate) apply(true);
      else preloadedImages.get(step.image)?.then(apply);
    };

    const activate = (key, { immediate = false, announce = false } = {}) => {
      if (!validKeys.has(key)) return;
      const step = workflowSteps[key];
      const activeTab = tabs.find(tab => tab.dataset.homeRequestStep === key);
      if (!step || !activeTab) return;
      root.dataset.activeStep = key;

      tabs.forEach(item => {
        const active = item === activeTab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
        item.tabIndex = active ? 0 : -1;
      });
      panel.parentElement?.setAttribute("aria-live", announce ? "polite" : "off");
      renderContent(step, activeTab, immediate);
      renderBackground(step, immediate);
    };

    const activeIndex = () => Math.max(0, tabs.findIndex(tab => tab.dataset.homeRequestStep === committedKey));
    const isPaused = () => pauseReasons.size > 0;
    const clearWait = () => {
      window.clearTimeout(waitTimer);
      waitTimer = 0;
      waitStartedAt = 0;
      waitRemaining = 0;
      waitCallback = null;
    };
    const armWait = () => {
      if (isPaused() || !waitCallback || waitTimer) return;
      waitStartedAt = window.performance.now();
      waitTimer = window.setTimeout(() => {
        const callback = waitCallback;
        waitTimer = 0;
        waitStartedAt = 0;
        waitRemaining = 0;
        waitCallback = null;
        callback?.();
      }, Math.max(0, waitRemaining));
    };
    const scheduleWait = (duration, callback) => {
      clearWait();
      waitRemaining = duration;
      waitCallback = callback;
      armWait();
    };
    const pauseWait = () => {
      if (!waitTimer) return;
      waitRemaining = Math.max(0, waitRemaining - (window.performance.now() - waitStartedAt));
      window.clearTimeout(waitTimer);
      waitTimer = 0;
      waitStartedAt = 0;
    };
    const cancelMotion = () => {
      motionToken += 1;
      motionAnimations.forEach(animation => animation.cancel());
      motionAnimations = [];
      tabs.forEach(tab => tab.classList.remove("is-arriving"));
      root.dataset.homeRequestMotion = "dwelling";
    };
    const cancelSequence = () => {
      clearWait();
      cancelMotion();
      rail.classList.remove("is-resetting");
    };
    let scheduleNext = () => {};
    const setPauseReason = (reason, paused) => {
      if (paused) pauseReasons.add(reason);
      else pauseReasons.delete(reason);
      root.classList.toggle("is-autoplay-paused", isPaused());
      if (isPaused()) {
        pauseWait();
        motionAnimations.forEach(animation => animation.pause());
      } else {
        motionAnimations.forEach(animation => animation.play());
        if (waitCallback) armWait();
        else if (!motionAnimations.length) scheduleNext();
      }
    };

    const resetToStart = () => {
      if (isPaused()) return;
      rail.classList.add("is-resetting");
      root.dataset.homeRequestMotion = "resetting";
      scheduleWait(RESET_FADE_MS, () => {
        committedKey = fallbackKey;
        activate(committedKey, { immediate: true });
        setProgress(0);
        scheduleWait(RESET_REVEAL_MS, () => {
          rail.classList.remove("is-resetting");
          root.dataset.homeRequestMotion = "dwelling";
          scheduleNext();
        });
      });
    };
    const travelTo = targetIndex => {
      if (isPaused()) return;
      const fromIndex = activeIndex();
      if (targetIndex <= fromIndex || targetIndex >= tabs.length) return;
      clearWait();
      cancelMotion();
      const token = motionToken;
      root.dataset.homeRequestMotion = "travelling";
      if (reducedMotion || typeof runner.animate !== "function" || typeof fill.animate !== "function") {
        committedKey = tabs[targetIndex].dataset.homeRequestStep;
        setProgress(targetIndex);
        activate(committedKey);
        const targetTab = tabs[targetIndex];
        targetTab.classList.add("is-arriving");
        root.dataset.homeRequestMotion = "capturing";
        scheduleWait(CAPTURE_MS, () => {
          targetTab.classList.remove("is-arriving");
          root.dataset.homeRequestMotion = "dwelling";
          scheduleNext();
        });
        return;
      }
      motionAnimations = [
        runner.animate(
          [{ transform: runnerTransform(fromIndex) }, { transform: runnerTransform(targetIndex) }],
          { duration: TRAVEL_MS, easing: "cubic-bezier(.45,.05,.2,1)", fill: "forwards" }
        ),
        fill.animate(
          [{ transform: `scaleX(${progressRatio(fromIndex)})` }, { transform: `scaleX(${progressRatio(targetIndex)})` }],
          { duration: TRAVEL_MS, easing: "cubic-bezier(.45,.05,.2,1)", fill: "forwards" }
        )
      ];
      Promise.all(motionAnimations.map(animation => animation.finished)).then(() => {
        if (token !== motionToken) return;
        const nextKey = tabs[targetIndex].dataset.homeRequestStep;
        const finished = [...motionAnimations];
        committedKey = nextKey;
        setProgress(targetIndex);
        finished.forEach(animation => animation.cancel());
        motionAnimations = [];
        activate(nextKey);
        const targetTab = tabs[targetIndex];
        targetTab.classList.add("is-arriving");
        root.dataset.homeRequestMotion = "capturing";
        scheduleWait(CAPTURE_MS, () => {
          targetTab.classList.remove("is-arriving");
          root.dataset.homeRequestMotion = "dwelling";
          scheduleNext();
        });
      }).catch(() => {});
    };
    scheduleNext = () => {
      if (isPaused() || waitCallback || motionAnimations.length) return;
      const index = activeIndex();
      if (index >= tabs.length - 1) scheduleWait(END_HOLD_MS, resetToStart);
      else scheduleWait(DWELL_MS, () => travelTo(index + 1));
    };
    const manualActivate = key => {
      if (!validKeys.has(key)) return;
      cancelSequence();
      committedKey = key;
      activate(key, { announce: true });
      setProgress(tabs.findIndex(tab => tab.dataset.homeRequestStep === key));
      root.dataset.homeRequestMotion = "dwelling";
      setPauseReason("manual", true);
      window.clearTimeout(manualResumeTimer);
      manualResumeTimer = window.setTimeout(() => setPauseReason("manual", false), MANUAL_HOLD_MS);
    };

    tabs.forEach((tab, index) => {
      const key = tab.dataset.homeRequestStep;
      tab.addEventListener("click", () => manualActivate(key));
      tab.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let targetIndex = index;
        if (event.key === "ArrowLeft") targetIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "ArrowRight") targetIndex = (index + 1) % tabs.length;
        if (event.key === "Home") targetIndex = 0;
        if (event.key === "End") targetIndex = tabs.length - 1;
        const target = tabs[targetIndex];
        manualActivate(target.dataset.homeRequestStep);
        target.focus({ preventScroll: true });
      });
    });

    document.addEventListener("visibilitychange", () => setPauseReason("hidden", document.hidden));
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        const entry = entries[0];
        setPauseReason("offscreen", !(entry?.isIntersecting && entry.intersectionRatio >= 0.45));
      }, { threshold: [0, 0.45, 1] });
      observer.observe(root);
    } else {
      setPauseReason("offscreen", false);
    }
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          if (root.dataset.homeRequestMotion === "travelling") cancelSequence();
          setProgress(activeIndex());
          if (!isPaused()) scheduleNext();
        });
      });
      observer.observe(rail);
    }

    activate(committedKey, { immediate: true });
    setProgress(activeIndex());
    root.dataset.homeRequestMotion = "dwelling";
    root.dataset.homeRequestWorkflowReady = "true";
    root.classList.toggle("is-autoplay-paused", isPaused());
    scheduleNext();
  };

  initAdvantages();
  initSupplyMap();
  initPartnerLogoCarousel();
  initWorkflow();
})();
