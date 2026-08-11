/* pages/about.js — About + Gallery + Videos + Contact
   Секції рендеряться лише коли потрапляють у viewport (IntersectionObserver) */
(function () {
  const { useState, useEffect, useRef, useContext, useCallback } = React;
  const html = window.html;
  const Ctx  = window.useApp;

  /* ── Lazy section wrapper ──
     Показує placeholder поки секція поза viewport,
     рендерить контент коли наближається (rootMargin 150px) */
  function LazySection({ children, minHeight = '400px' }) {
    const ref = useRef();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (!('IntersectionObserver' in window)) { setVisible(true); return; }
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
        { rootMargin: '150px' }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    return html`<div ref=${ref}>${visible
      ? children
      : html`<div class="lazy-placeholder" style=${{ minHeight }}>⏳</div>`}
    </div>`;
  }

  /* ── About section (above fold — завжди рендериться) ── */
  function AboutSection({ t }) {
    return html`
      <div class="page-section" id="about">
        <div class="section-inner">
          <div class="about-wrap">
            <div>
              <div class="about-img">
                <img src="holovna/5253685811759224568_120.jpg"
                     alt="Діти Божі"
                     loading="lazy"
                     onError=${e => { e.target.style.display='none'; }}/>
                <div class="about-badge">${t.about_badge}</div>
              </div>
            </div>
            <div class="about-text">
              <span class="section-tag">${t.about_tag}</span>
              <h2 class="section-title" dangerouslySetInnerHTML=${{ __html: t.about_title }}></h2>
              <div class="section-line"></div>
              <p>${t.about_p1}</p>
              <p>${t.about_p2}</p>
              <div class="about-stats">
                <div class="stat-box"><div class="stat-num">5+</div><div class="stat-lbl">${t.stat_members}</div></div>
                <div class="stat-box"><div class="stat-num">50+</div><div class="stat-lbl">${t.stat_concerts}</div></div>
                <div class="stat-box"><div class="stat-num">2020</div><div class="stat-lbl">${t.stat_year}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ── Gallery section (preview на about-сторінці) ── */
  function GallerySection({ t }) {
    const { navigate } = Ctx();
    const [previews, setPreviews] = useState([]);   // перші 4 фото
    const [total,    setTotal]    = useState(0);

    useEffect(() => {
      fetch('img/gallery.json')
        .then(r => r.ok ? r.json() : [])
        .then(list => {
          if (Array.isArray(list) && list.length) {
            setTotal(list.length);
            // Беремо кожне 13-те фото (індекси 0,13,26,39,...) — макс 9 штук
            const picked = [];
            for (let i = 0; i < list.length && picked.length < 9; i += 13) {
              picked.push(list[i]);
            }
            setPreviews(picked);
          }
        })
        .catch(() => {});
    }, []);

    return html`
      <div class="page-section gallery-section" id="gallery">
        <div class="section-inner">
          <span class="section-tag">${t.gallery_tag}</span>
          <h2 class="section-title" dangerouslySetInnerHTML=${{ __html: t.gallery_title }}></h2>
          <div class="section-line"></div>

          <div class="gallery-grid">
            ${previews.length > 0
              ? previews.map((f, i) => html`
                  <div class="gallery-item" key=${i}>
                    <img src=${'img/' + f} alt="" loading="lazy"
                         style=${{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                         onError=${e => e.target.parentElement.style.display='none'}/>

                  </div>`)
              : [1,2,3,4,5,6,7,8,9].map(i => html`
                  <div class="gallery-item" key=${'ph'+i}>
                    <div class="gallery-ph">📸</div>
                  </div>`)}
          </div>

          <div style=${{ textAlign:'center', marginTop:'1.5rem' }}>
            <button class="gallery-view-btn" onClick=${() => navigate('gallery')}>
              ${t.gallery_view_all}
              ${total > 0 ? html`<span class="gallery-view-count">${total}</span>` : null}
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ── Videos section ── */
  function VideosSection({ t }) {
    const [playing, setPlaying] = useState(null);

    const videos = [
      { id: 'y5oPcHOqN6E', titleKey: 'v1' },
      { id: 'C9i75QNCPNA', titleKey: 'v2' },
      { id: 'bc6AkzOF3Aw', titleKey: 'v3' },
    ];

    return html`
      <div class="page-section videos-section" id="videos">
        <div class="section-inner">
          <span class="section-tag">${t.videos_tag}</span>
          <h2 class="section-title" dangerouslySetInnerHTML=${{ __html: t.videos_title }}></h2>
          <div class="section-line"></div>
          <div class="videos-grid">
            ${videos.map(v => html`
              <div class="video-card" key=${v.id}>
                <div class="video-player">
                  ${playing === v.id
                    ? html`<iframe
                        src=${'https://www.youtube.com/embed/' + v.id + '?autoplay=1&rel=0'}
                        frameBorder="0"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                        class="video-iframe"
                      />`
                    : html`<div class="video-thumb" onClick=${() => setPlaying(v.id)}>
                        <img
                          src=${'https://img.youtube.com/vi/' + v.id + '/maxresdefault.jpg'}
                          alt=${t[v.titleKey]}
                          class="video-thumb-img"
                        />
                        <div class="video-play-overlay">
                          <div class="video-play-btn">
                            <svg viewBox="0 0 24 24" width="36" height="36">
                              <path fill="white" d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>`}
                </div>
                <div class="video-info">
                  <div class="video-title">${t[v.titleKey]}</div>
                  <a class="video-yt-link" href=${'https://www.youtube.com/watch?v=' + v.id} target="_blank">
                    <svg viewBox="0 0 24 24" width="15" height="15" style=${{ flexShrink: 0 }}>
                      <path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    ${t.yt_watch}
                  </a>
                </div>
              </div>`)}
          </div>
          <div class="video-cta">
            <a href="https://www.youtube.com/@child-of_God-t7o" target="_blank">${t.yt_btn}</a>
          </div>
        </div>
      </div>`;
  }

  /* ── Contact section ── */
  function ContactSection({ t }) {
    const [showEmail, setShowEmail] = useState(false);
    return html`
      <div class="page-section" id="contact">
        <div class="section-inner">
          <div class="contact-wrap">
            <span class="section-tag">${t.contact_tag}</span>
            <h2 class="section-title" dangerouslySetInnerHTML=${{ __html: t.contact_title }}></h2>
            <div class="section-line" style=${{ marginLeft: 'auto', marginRight: 'auto' }}></div>
            <p class="contact-desc">${t.contact_desc}</p>
            <div class="contact-btns">
              <button class="contact-btn btn-email" onClick=${() => setShowEmail(s => !s)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="white" d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span>${t.contact_email}</span>
              </button>
              <a class="contact-btn btn-tg" href="https://t.me/alexkhalus" target="_blank">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="white" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span>${t.contact_tg}</span>
              </a>
              <a class="contact-btn btn-yt" href="https://www.youtube.com/@child-of_God-t7o" target="_blank">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="white" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>${t.contact_yt}</span>
              </a>
            </div>
            ${showEmail && html`
              <div class="email-reveal">📧 <span>alexhalus201006@gmail.com</span></div>`}
          </div>
        </div>
      </div>`;
  }

  /* ── About Page ── */
  function AboutPage() {
    const { t } = Ctx();
    return html`
      <div>
        <${AboutSection} t=${t}/>
        <hr class="section-divider"/>
        <${LazySection} minHeight="460px">
          <${GallerySection} t=${t}/>
        <//>
        <hr class="section-divider"/>
        <${LazySection} minHeight="400px">
          <${VideosSection} t=${t}/>
        <//>
        <hr class="section-divider"/>
        <${LazySection} minHeight="350px">
          <${ContactSection} t=${t}/>
        <//>
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.about = AboutPage;
})();
