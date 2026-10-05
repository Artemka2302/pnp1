const reader = document.querySelector('[data-pdf-reader]');

function trackSolution(action, detail = {}) {
  window.dispatchEvent(new CustomEvent('pnp:solution', { detail: { action, ...detail } }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'solution_' + action, ...detail });
}

if (reader) {
  const canvas = reader.querySelector('[data-pdf-canvas]');
  const stage = reader.querySelector('[data-pdf-stage]');
  const status = reader.querySelector('[data-pdf-status]');
  const thumbnails = reader.querySelector('[data-pdf-thumbnails]');
  const pageInput = reader.querySelector('[data-pdf-page]');
  const previous = reader.querySelector('[data-pdf-prev]');
  const next = reader.querySelector('[data-pdf-next]');
  const zoomIn = reader.querySelector('[data-pdf-zoom-in]');
  const zoomOut = reader.querySelector('[data-pdf-zoom-out]');
  const fit = reader.querySelector('[data-pdf-fit]');
  const text = document.querySelector('[data-pdf-text]');
  let pdf;
  let pageNumber = 1;
  let zoom = 1;
  let rendering = false;
  let pending = false;
  let destroyed = false;
  const thumbnailQueue = [];
  let thumbnailRendering = false;

  function updateControls() {
    previous.disabled = !pdf || pageNumber <= 1;
    next.disabled = !pdf || pageNumber >= pdf.numPages;
    pageInput.disabled = !pdf;
    pageInput.value = pageNumber;
    fit.disabled = !pdf;
    zoomIn.disabled = !pdf || zoom >= 3;
    zoomOut.disabled = !pdf || zoom <= 0.5;
    reader.querySelector('[data-pdf-zoom]').textContent = Math.round(zoom * 100) + '%';
    thumbnails.querySelectorAll('button').forEach(button => {
      if (Number(button.dataset.page) === pageNumber) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  async function renderPage() {
    if (!pdf || destroyed) return;
    if (rendering) { pending = true; return; }
    rendering = true;
    const requestedPage = pageNumber;
    stage.setAttribute('aria-busy', 'true');
    try {
      const page = await pdf.getPage(requestedPage);
      const original = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(180, stage.clientWidth - 40);
      const availableHeight = Math.max(150, stage.clientHeight - 40);
      const scale = Math.min(availableWidth / original.width, availableHeight / original.height) * zoom;
      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      // Render off-screen to keep the previous slide visible during rapid navigation.
      const buffer = document.createElement('canvas');
      buffer.width = Math.ceil(viewport.width * pixelRatio);
      buffer.height = Math.ceil(viewport.height * pixelRatio);
      await page.render({ canvasContext: buffer.getContext('2d'), viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] }).promise;
      if (destroyed) return;
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';
      canvas.getContext('2d').drawImage(buffer, 0, 0);
      canvas.hidden = false;
      canvas.setAttribute('aria-label', `${reader.dataset.pdfTitle}. Страница ${requestedPage} из ${pdf.numPages}`);
      status.hidden = true;
      const content = await page.getTextContent();
      if (text) text.textContent = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      reader.dataset.renderedPage = requestedPage;
    } catch (error) {
      status.textContent = 'Не удалось показать страницу. Попробуйте другую страницу или скачайте PDF.';
      status.hidden = false;
      reader.querySelector('[data-pdf-fallback]').hidden = false;
      console.error('Presentation page could not be rendered', error);
    } finally {
      rendering = false;
      stage.setAttribute('aria-busy', 'false');
      if (pending) { pending = false; renderPage(); }
    }
  }

  function goToPage(number, announce = true) {
    if (!pdf) return;
    const requested = Number.isFinite(number) ? Math.trunc(number) : pageNumber;
    pageNumber = Math.max(1, Math.min(pdf.numPages, requested));
    updateControls();
    renderPage();
    if (announce) {
      const location = new URL(window.location.href);
      location.hash = 'page=' + pageNumber;
      history.replaceState(null, '', location);
      trackSolution('page', { document: reader.dataset.pdfTitle, page: pageNumber });
    }
  }

  async function drainThumbnails() {
    if (thumbnailRendering || destroyed) return;
    thumbnailRendering = true;
    while (thumbnailQueue.length && !destroyed) {
      const button = thumbnailQueue.shift();
      try {
        const page = await pdf.getPage(Number(button.dataset.page));
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 220 / base.width });
        const preview = button.querySelector('canvas');
        preview.width = Math.ceil(viewport.width);
        preview.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: preview.getContext('2d'), viewport }).promise;
      } catch { /* A missing preview must never block the presentation itself. */ }
    }
    thumbnailRendering = false;
  }

  function createThumbnails() {
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach(entry => {
        observer.unobserve(entry.target);
        thumbnailQueue.push(entry.target);
      });
      drainThumbnails();
    }, { root: thumbnails, rootMargin: '100px' });
    for (let number = 1; number <= pdf.numPages; number++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'solution-reader-thumbnail';
      button.dataset.page = number;
      button.setAttribute('aria-label', 'Перейти на страницу ' + number);
      const preview = document.createElement('canvas');
      preview.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = number;
      button.append(preview, label);
      button.addEventListener('click', () => goToPage(number));
      thumbnails.append(button);
      observer.observe(button);
    }
    updateControls();
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }

  previous.addEventListener('click', () => goToPage(pageNumber - 1));
  next.addEventListener('click', () => goToPage(pageNumber + 1));
  pageInput.addEventListener('change', () => goToPage(Number(pageInput.value)));
  pageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      goToPage(Number(pageInput.value));
    }
  });
  function changeZoom(value) { zoom = Math.max(0.5, Math.min(3, value)); updateControls(); renderPage(); }
  zoomIn.addEventListener('click', () => changeZoom(zoom + 0.25));
  zoomOut.addEventListener('click', () => changeZoom(zoom - 0.25));
  fit.addEventListener('click', () => changeZoom(1));
  reader.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPage(pageNumber + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  const fullscreen = reader.querySelector('[data-pdf-fullscreen]');
  if (!document.fullscreenEnabled) fullscreen.hidden = true;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await reader.requestFullscreen();
    } catch { fullscreen.hidden = true; }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Выйти из полноэкранного режима' : 'Развернуть презентацию на весь экран');
    renderPage();
  });
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderPage(), 150);
  }).observe(stage);
  window.addEventListener('pagehide', () => { destroyed = true; pdf?.destroy(); }, { once: true });
  reader.querySelector('[data-solution-download]').addEventListener('click', () => trackSolution('download', { document: reader.dataset.pdfTitle }));

  try {
    const pdfjs = await import(reader.dataset.pdfLibrary);
    pdfjs.GlobalWorkerOptions.workerSrc = reader.dataset.pdfWorker;
    pdf = await pdfjs.getDocument({
      url: reader.dataset.pdfUrl,
      cMapUrl: reader.dataset.pdfAssets + 'cmaps/',
      cMapPacked: true,
      standardFontDataUrl: reader.dataset.pdfAssets + 'standard_fonts/',
      wasmUrl: reader.dataset.pdfAssets + 'wasm/',
      isEvalSupported: false,
    }).promise;
    reader.querySelector('[data-pdf-total]').textContent = pdf.numPages;
    pageInput.max = pdf.numPages;
    const initialPage = Number(new URLSearchParams(location.hash.slice(1)).get('page')) || 1;
    goToPage(initialPage, false);
    createThumbnails();
    trackSolution('view', { document: reader.dataset.pdfTitle });
  } catch (error) {
    stage.setAttribute('aria-busy', 'false');
    status.textContent = 'Не удалось загрузить презентацию.';
    reader.querySelector('[data-pdf-fallback]').hidden = false;
    console.error('Presentation could not be loaded', error);
  }
}
