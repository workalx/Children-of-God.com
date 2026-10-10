/* pages/gallery.js
   Показує фото з постів і архів із img/gallery.json (window.loadGallery),
   кожне фото отримує src ТІЛЬКИ коли воно входить у viewport (IntersectionObserver).
*/
(function () {
  const { useState, useEffect, useRef } = React;
  const html = window.html;
  const Ctx  = window.useApp;

  /* ── Одне фото з ледачим завантаженням ──────────────────── */
  function LazyImage({ src, index }) {
    const wrapRef  = useRef();
    const [inView,  setInView]  = useState(false);   // чи видно на екрані
    const [loaded,  setLoaded]  = useState(false);   // чи завантажилось
    const [broken,  setBroken]  = useState(false);   // чи помилка 404

    // Спостерігаємо за елементом; src встановлюється тільки після появи
    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      if (!('IntersectionObserver' in window)) { setInView(true); return; }

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        },
        { rootMargin: '300px' }   // починає підвантаження за 300px до появи
      );
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    if (broken) return null;   // приховуємо битий файл

    return html`
      <div class=${'gallery-lazy-item' + (loaded ? ' is-loaded' : '')}
           ref=${wrapRef}
           onClick=${() => window.__galleryOpen && window.__galleryOpen(index)}>
        ${inView
          ? html`<img
              src=${src}
              alt=""
              loading="lazy"
              onLoad=${()  => setLoaded(true)}
              onError=${() => setBroken(true)}
            />`
          : html`<div class="gallery-skeleton"></div>`}
      </div>`;
  }

  /* ── Lightbox (повноекранний перегляд) ──────────────────── */
  function Lightbox({ images, startIndex, onClose }) {
    const [idx, setIdx] = useState(startIndex);

    useEffect(() => {
      const fn = e => {
        if (e.key === 'Escape')    onClose();
        if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
        if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + images.length) % images.length);
      };
      document.addEventListener('keydown', fn);
      return () => document.removeEventListener('keydown', fn);
    }, [images.length]);

    return html`
      <div class="lightbox-overlay" onClick=${e => e.target === e.currentTarget && onClose()}>
        <button class="lightbox-close" onClick=${onClose}>✕</button>
        <button class="lightbox-prev"
                onClick=${() => setIdx(i => (i - 1 + images.length) % images.length)}>‹</button>
        <div class="lightbox-img-wrap">
          <img src=${images[idx]} alt="" class="lightbox-img"/>
          <div class="lightbox-counter">${idx + 1} / ${images.length}</div>
        </div>
        <button class="lightbox-next"
                onClick=${() => setIdx(i => (i + 1) % images.length)}>›</button>
      </div>`;
  }

  /* ── Головна сторінка галереї ────────────────────────────── */
  function GalleryPage() {
    const { t } = Ctx();
    const [images,   setImages]   = useState([]);
    const [status,   setStatus]   = useState('loading'); // loading | ok | empty
    const [lightbox, setLightbox] = useState(null);      // null або індекс

    // Відкриваємо lightbox через глобальний хелпер (викликається з LazyImage)
    useEffect(() => {
      window.__galleryOpen = idx => setLightbox(idx);
      return () => { delete window.__galleryOpen; };
    }, []);

    useEffect(() => {
      window.loadGallery().then(list => {
        setImages(list);
        setStatus(list.length ? 'ok' : 'empty');
      });
    }, []);

    return html`
      <div class="page-section gallery-page-section">
        <div class="section-inner">
          <span class="section-tag">${t.gallery_tag}</span>
          <h1 class="section-title"
              dangerouslySetInnerHTML=${{ __html: t.gallery_title }}></h1>
          <div class="section-line" style=${{ marginLeft: 'auto', marginRight: 'auto' }}></div>

          ${status === 'loading' && html`
            <div class="gallery-status-msg">⏳ ${t.gallery_loading}</div>`}

          ${status === 'empty' && html`
            <div class="gallery-status-msg">
              <span style=${{ fontSize: '3rem', display: 'block', marginBottom: '.75rem' }}>📷</span>
              ${t.gallery_hint}
            </div>`}

          ${status === 'ok' && html`
            <p class="gallery-count">${images.length} ${t.gallery_photos}</p>
            <div class="gallery-full-grid">
              ${images.map((f, i) => html`
                <${LazyImage} key=${f} src=${f} index=${i}/>`)}
            </div>`}
        </div>

        ${lightbox !== null && html`
          <${Lightbox}
            images=${images}
            startIndex=${lightbox}
            onClose=${() => setLightbox(null)}/>`}
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.gallery = GalleryPage;
})();
