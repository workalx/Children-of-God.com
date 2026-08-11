/* ══════════════════════════════════════════════
   APP.JS — React SPA (CDN + htm, без збірки)
   ══════════════════════════════════════════════ */

// htm binding — виконується після htm.js (defer-скрипти виконуються по порядку)
window.html = htm.bind(React.createElement);

(function () {
  const { useState, useEffect, useRef, useCallback, createContext, useContext, memo } = React;
  const html = window.html;

  // Тимчасове блокування стрічки новин — став false, коли треба відкрити розділ
  const FEED_LOCKED = true;
  const HOME_PAGE = FEED_LOCKED ? 'about' : 'feed';

  /* ─────────────────────────────
     I18N
  ───────────────────────────── */
  const I18N = {
    uk: {
      nav_logo: '✝ Діти Божі', nav_home: 'Стрічка', nav_about: 'Про нас', nav_gallery: 'Галерея', nav_donate: 'Донат',
      login_btn: 'Увійти', logout_btn: 'Вийти', greeting: 'Привіт,',
      auth_tab_login: 'Увійти', auth_tab_register: 'Реєстрація',
      auth_name: "Ім'я", auth_email: 'Email', auth_password: 'Пароль',
      footer: '© 2026 <strong>Діти Божі</strong> — Музична група. Слава Богу за кожну пісню. ✝',
      feed_tag: 'Стрічка', feed_title: 'Актуальні <span>Новини</span>',
      feed_empty: "Поки що публікацій немає. Незабаром щось з'явиться! 🙏",
      feed_locked_title: 'Розділ <span>Новини</span>',
      feed_locked_desc: 'Стрічка новин зараз готується і скоро відкриється. Слідкуйте за оновленнями! 🙏',
      comment_placeholder: 'Написати коментар…',
      comment_login: 'Щоб коментувати — <a>увійдіть</a>',
      about_tag: 'Про нас', about_title: 'Ми — <span>Діти Божі</span>', about_badge: '🎶 Слава Господу!',
      about_p1: '«Діти Божі» — музична група, що несе слово Боже через пісню та хвалу. Наша місія — торкатись сердець людей, надихати на молитву і прославляти Господа щирою, живою музикою.',
      about_p2: 'Ми виступаємо на богослужіннях, концертах, фестивалях і зустрічах, поєднуючи сучасні аранжування з глибокими духовними текстами. Кожна пісня — це молитва, що звучить від серця до неба.',
      stat_members: 'Учасників', stat_concerts: 'Концертів', stat_year: 'Рік заснування',
      gallery_tag: 'Фотографії', gallery_title: 'Наша <span>Галерея</span>',
      gallery_hint: 'Фотографій ще немає. Додайте файли у папку img/ та оновіть img/gallery.json', gallery_main: 'Головне фото',
      gallery_loading: 'Завантаження фото…', gallery_photos: 'фото', gallery_view_all: '🖼 Переглянути всю галерею',
      videos_tag: 'YouTube', videos_title: 'Наші <span>Відео</span>',
      v1: 'Звичайна співаночка «Дітей Божих»', v2: 'Because He lives — Child of God', v3: 'Прославлення в торговельному центрі',
      yt_btn: '▶ Наш канал на YouTube', yt_watch: '▶ Дивитися на YouTube',
      contact_tag: "Зв'язок", contact_title: 'Зв\'яжіться з <span>Нами</span>',
      contact_desc: 'Запрошуємо на виступи, богослужіння та спільну молитву. Пишіть нам — відповімо з радістю!',
      contact_email: 'Email', contact_tg: 'Telegram', contact_yt: 'YouTube',
      donate_tag: 'Підтримка', donate_title: 'Підтримайте <span>Наше Служіння</span>',
      donate_desc: 'Ваша підтримка допомагає нам створювати нові пісні, записувати альбоми та нести Слово Боже далі. Кожна пожертва — це внесок у Боже Царство. Дякуємо!',
      donate_card2_title: 'PayPal', donate_card2_text: 'Міжнародний переказ через PayPal',
      donate_card4_title: 'Interac e-Transfer', donate_card4_text: 'Переказ через Interac (Канада)',
      donate_see_email: 'Побачити email ↓', donate_btn: '❤️ Підтримати зараз',
      modal_title: 'Дякуємо за підтримку!', modal_desc: 'Надішліть свій донат на один із цих email:',
      modal_thanks: 'Нехай Господь благословить вас за кожну підтримку! 🙏',
      hero_sub: 'Музична Група · Християнська Музика',
      hero_title: 'Діти <span>Божі</span>',
    },
    en: {
      nav_logo: '✝ Children of God', nav_home: 'Feed', nav_about: 'About Us', nav_gallery: 'Gallery', nav_donate: 'Donate',
      login_btn: 'Log in', logout_btn: 'Log out', greeting: 'Hi,',
      auth_tab_login: 'Log in', auth_tab_register: 'Register',
      auth_name: 'Name', auth_email: 'Email', auth_password: 'Password',
      footer: '© 2026 <strong>Children of God</strong> — Music Group. Glory to God for every song. ✝',
      feed_tag: 'Feed', feed_title: 'Latest <span>News</span>',
      feed_empty: 'No posts yet. Something is coming soon! 🙏',
      feed_locked_title: '<span>News</span> Feed',
      feed_locked_desc: "The news feed is being prepared and will open soon. Stay tuned! 🙏",
      comment_placeholder: 'Write a comment…',
      comment_login: 'To comment — <a>log in</a>',
      about_tag: 'About Us', about_title: 'We are <span>Children of God</span>', about_badge: '🎶 Glory to God!',
      about_p1: '"Children of God" is a music group that carries the Word of God through song and praise. Our mission is to touch people\'s hearts, inspire prayer, and glorify the Lord through sincere, living music.',
      about_p2: 'We perform at church services, concerts, festivals and gatherings, combining modern arrangements with deep spiritual texts. Every song is a prayer that rises from the heart to heaven.',
      stat_members: 'Members', stat_concerts: 'Concerts', stat_year: 'Founded',
      gallery_tag: 'Photos', gallery_title: 'Our <span>Gallery</span>',
      gallery_hint: 'No photos yet. Add files to the img/ folder and update img/gallery.json', gallery_main: 'Main photo',
      gallery_loading: 'Loading photos…', gallery_photos: 'photos', gallery_view_all: '🖼 View full gallery',
      videos_tag: 'YouTube', videos_title: 'Our <span>Videos</span>',
      v1: 'Ordinary Singing of "Children of God"', v2: 'Because He lives — Child of God', v3: 'Worship in the Shopping Centre',
      yt_btn: '▶ Our YouTube Channel', yt_watch: '▶ Watch on YouTube',
      contact_tag: 'Contact', contact_title: 'Get in <span>Touch</span>',
      contact_desc: 'We welcome invitations to performances, services, and prayer gatherings. Write to us — we\'ll respond with joy!',
      contact_email: 'Email', contact_tg: 'Telegram', contact_yt: 'YouTube',
      donate_tag: 'Support', donate_title: 'Support <span>Our Ministry</span>',
      donate_desc: 'Your support helps us create new songs, record albums, and spread the Word of God further. Every donation is a contribution to God\'s Kingdom. Thank you!',
      donate_card2_title: 'PayPal', donate_card2_text: 'International transfer via PayPal',
      donate_card4_title: 'Interac e-Transfer', donate_card4_text: 'Transfer via Interac (Canada)',
      donate_see_email: 'See email ↓', donate_btn: '❤️ Donate Now',
      modal_title: 'Thank you for your support!', modal_desc: 'Send your donation to one of these emails:',
      modal_thanks: 'May God bless you for every contribution! 🙏',
      hero_sub: 'Music Group · Christian Music',
      hero_title: 'Children of <span>God</span>',
    },
    ru: {
      nav_logo: '✝ Дети Божьи', nav_home: 'Лента', nav_about: 'О нас', nav_gallery: 'Галерея', nav_donate: 'Донат',
      login_btn: 'Войти', logout_btn: 'Выйти', greeting: 'Привет,',
      auth_tab_login: 'Войти', auth_tab_register: 'Регистрация',
      auth_name: 'Имя', auth_email: 'Email', auth_password: 'Пароль',
      footer: '© 2026 <strong>Дети Божьи</strong> — Музыкальная группа. Слава Богу за каждую песню. ✝',
      feed_tag: 'Лента', feed_title: 'Актуальные <span>Новости</span>',
      feed_empty: 'Публикаций пока нет. Скоро что-то появится! 🙏',
      feed_locked_title: 'Раздел <span>Новости</span>',
      feed_locked_desc: 'Лента новостей сейчас готовится и скоро откроется. Следите за обновлениями! 🙏',
      comment_placeholder: 'Написать комментарий…',
      comment_login: 'Чтобы комментировать — <a>войдите</a>',
      about_tag: 'О нас', about_title: 'Мы — <span>Дети Божьи</span>', about_badge: '🎶 Слава Господу!',
      about_p1: '«Дети Божьи» — музыкальная группа, несущая Слово Божье через песню и хвалу. Наша миссия — касаться сердец людей, вдохновлять на молитву и прославлять Господа искренней, живой музыкой.',
      about_p2: 'Мы выступаем на богослужениях, концертах, фестивалях и встречах, сочетая современные аранжировки с глубокими духовными текстами. Каждая песня — это молитва, звучащая от сердца к небу.',
      stat_members: 'Участников', stat_concerts: 'Концертов', stat_year: 'Год основания',
      gallery_tag: 'Фотографии', gallery_title: 'Наша <span>Галерея</span>',
      gallery_hint: 'Фотографий пока нет. Добавьте файлы в папку img/ и обновите img/gallery.json', gallery_main: 'Главное фото',
      gallery_loading: 'Загрузка фото…', gallery_photos: 'фото', gallery_view_all: '🖼 Смотреть всю галерею',
      videos_tag: 'YouTube', videos_title: 'Наши <span>Видео</span>',
      video_soon: 'Видео будет добавлено скоро', soon: 'Скоро',
      v1: 'Обычное пение «Детей Божьих»', v2: 'Because He lives — Child of God', v3: 'Прославление в торговом центре',
      yt_btn: '▶ Наш канал на YouTube', yt_watch: '▶ Смотреть на YouTube',
      contact_tag: 'Контакты', contact_title: 'Свяжитесь с <span>Нами</span>',
      contact_desc: 'Приглашаем на выступления, богослужения и совместную молитву. Пишите нам — ответим с радостью!',
      contact_email: 'Email', contact_tg: 'Telegram', contact_yt: 'YouTube',
      donate_tag: 'Поддержка', donate_title: 'Поддержите <span>Наше Служение</span>',
      donate_desc: 'Ваша поддержка помогает нам создавать новые песни, записывать альбомы и нести Слово Божье дальше. Каждое пожертвование — вклад в Царство Божье. Спасибо!',
      donate_card2_title: 'PayPal', donate_card2_text: 'Международный перевод через PayPal',
      donate_card4_title: 'Interac e-Transfer', donate_card4_text: 'Перевод через Interac (Канада)',
      donate_see_email: 'Посмотреть email ↓', donate_btn: '❤️ Поддержать сейчас',
      modal_title: 'Спасибо за поддержку!', modal_desc: 'Отправьте пожертвование на один из этих email:',
      modal_thanks: 'Пусть Господь благословит вас за каждую поддержку! 🙏',
      hero_sub: 'Музыкальная Группа · Христианская Музыка',
      hero_title: 'Дети <span>Божьи</span>',
    },
  };

  /* ─────────────────────────────
     Context
  ───────────────────────────── */
  const Ctx = createContext({});
  window.useApp = () => useContext(Ctx);

  /* ─────────────────────────────
     Nav
  ───────────────────────────── */
  const Nav = memo(function Nav({ page, navigate }) {
    const { lang, t, applyLang, user, setUser, setShowAuth } = useContext(Ctx);

    function doLogout() {
      if (typeof authLogout === 'function') authLogout();
      setUser(null);
    }

    return html`
      <nav>
        <a class="nav-logo-img" href=${'#' + HOME_PAGE} onClick=${e => { e.preventDefault(); navigate(HOME_PAGE); }}>
          <img src=${lang === 'uk' ? 'logo.png' : lang === 'ru' ? 'logo(2).png' : 'logo(1).png'} alt=${t.nav_logo} class="nav-logo-png" onerror=${e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }}/>
          <span class="nav-logo-fallback" style=${{ display:'none' }}>${t.nav_logo}</span>
        </a>
        <div class="nav-right">
          <ul class="nav-links">
            ${[['feed', t.nav_home], ['about', t.nav_about], ['donate', t.nav_donate]].filter(([p]) => !(FEED_LOCKED && p === 'feed')).map(([p, label]) => html`
              <li key=${p}>
                <a href=${'#' + p}
                   class=${page === p ? 'active' : ''}
                   onClick=${e => { e.preventDefault(); navigate(p); }}>
                  ${label}
                </a>
              </li>`)}
          </ul>
          <div class="nav-user">
            ${user
              ? html`
                  <span class="nav-user-name">${t.greeting} ${user.username}</span>
                  <button class="nav-logout-btn" onClick=${doLogout}>${t.logout_btn}</button>`
              : html`
                  <button class="nav-login-btn" onClick=${() => setShowAuth(true)}>${t.login_btn}</button>`}
          </div>
          <div class="lang-switcher">
            ${['uk', 'en', 'ru'].map(l => html`
              <button key=${l} class=${'lang-btn' + (lang === l ? ' active' : '')}
                      onClick=${() => applyLang(l)}>
                ${l === 'uk' ? 'UA' : l.toUpperCase()}
              </button>`)}
          </div>
        </div>
      </nav>`;
  });

  /* ─────────────────────────────
     Footer
  ───────────────────────────── */
  function Footer() {
    const { t } = useContext(Ctx);
    return html`<footer dangerouslySetInnerHTML=${{ __html: t.footer }}/>`;
  }

  /* ─────────────────────────────
     Auth Modal
  ───────────────────────────── */
  function AuthModal() {
    const { t, setShowAuth, setUser } = useContext(Ctx);
    const [tab, setTab]   = useState('login');
    const [err, setErr]   = useState('');
    const loginEmail = useRef(); const loginPass = useRef();
    const regName = useRef(); const regEmail = useRef(); const regPass = useRef();

    function close() { setShowAuth(false); setErr(''); }

    function doLogin() {
      const res = authLogin(loginEmail.current.value, loginPass.current.value);
      if (res.ok) { setUser(res.user); close(); }
      else setErr(res.msg.en || res.msg.uk);
    }
    function doRegister() {
      const res = authRegister(regName.current.value, regEmail.current.value, regPass.current.value);
      if (res.ok) { setUser(res.user); close(); }
      else setErr(res.msg.en || res.msg.uk);
    }

    // close on backdrop click
    function onBackdrop(e) { if (e.target === e.currentTarget) close(); }
    // close on Escape
    useEffect(() => {
      const fn = e => e.key === 'Escape' && close();
      document.addEventListener('keydown', fn);
      return () => document.removeEventListener('keydown', fn);
    }, []);

    return html`
      <div class="auth-overlay" onClick=${onBackdrop}>
        <div class="auth-box">
          <button class="auth-close" onClick=${close}>✕</button>
          <div class="auth-tabs">
            <button class=${'auth-tab' + (tab==='login' ? ' active':'')} onClick=${()=>{setTab('login');setErr('');}}>
              ${t.auth_tab_login}
            </button>
            <button class=${'auth-tab' + (tab==='register' ? ' active':'')} onClick=${()=>{setTab('register');setErr('');}}>
              ${t.auth_tab_register}
            </button>
          </div>
          <div class="auth-body">
            ${err && html`<div class="auth-error">${err}</div>`}
            ${tab === 'login' ? html`
              <div class="auth-field">
                <label>${t.auth_email}</label>
                <input type="email" ref=${loginEmail} autocomplete="email"/>
              </div>
              <div class="auth-field">
                <label>${t.auth_password}</label>
                <input type="password" ref=${loginPass} autocomplete="current-password"
                       onKeyDown=${e => e.key==='Enter' && doLogin()}/>
              </div>
              <button class="auth-submit" onClick=${doLogin}>${t.auth_tab_login}</button>
            ` : html`
              <div class="auth-field">
                <label>${t.auth_name}</label>
                <input type="text" ref=${regName} autocomplete="username"/>
              </div>
              <div class="auth-field">
                <label>${t.auth_email}</label>
                <input type="email" ref=${regEmail} autocomplete="email"/>
              </div>
              <div class="auth-field">
                <label>${t.auth_password}</label>
                <input type="password" ref=${regPass} autocomplete="new-password"
                       onKeyDown=${e => e.key==='Enter' && doRegister()}/>
              </div>
              <button class="auth-submit" onClick=${doRegister}>${t.auth_tab_register}</button>
            `}
          </div>
        </div>
      </div>`;
  }

  /* ─────────────────────────────
     Error Boundary (class component — required by React)
  ───────────────────────────── */
  class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) { console.error('[Діти Божі] page error:', err, info); }
    render() {
      if (this.state.err) {
        return React.createElement('div', { className: 'page-loader' },
          '⚠️ Помилка завантаження сторінки. Спробуйте ще раз.');
      }
      return this.props.children;
    }
  }

  /* ─────────────────────────────
     Page Loader — dynamic script per route
  ───────────────────────────── */
  const loadedPages = {};

  function PageLoader({ page }) {
    const [Comp, setComp] = useState(null);

    useEffect(() => {
      let alive = true;

      // Always reset to spinner on page change
      setComp(null);

      function done() {
        if (!alive) return;
        const C = window.Pages && window.Pages[page];
        setComp(() => C || NotFound);
      }

      // Already loaded?
      if (window.Pages && window.Pages[page]) { done(); return () => { alive = false; }; }

      // Script in flight or needs loading
      const existing = loadedPages[page];
      const p = existing || new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'pages/' + page + '.js';
        s.onload  = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });
      if (!existing) loadedPages[page] = p;
      p.then(done);

      return () => { alive = false; };
    }, [page]);

    if (!Comp) return html`<div class="page-loader">⏳</div>`;
    return html`<${ErrorBoundary} key=${page}><${Comp}/><//>`;
  }

  function NotFound() {
    return html`<div class="page-loader">404 — Сторінку не знайдено</div>`;
  }

  function FeedLocked() {
    const { t } = useContext(Ctx);
    return html`
      <div>
        <div class="hero-strip">
          <div class="hero-cross">✝</div>
          <h1 class="hero-name" dangerouslySetInnerHTML=${{ __html: t.hero_title }}></h1>
          <p class="hero-sub">${t.hero_sub}</p>
          <div class="hero-divider"></div>
        </div>
        <div class="feed-wrap">
          <span class="section-tag">${t.feed_tag}</span>
          <h2 class="section-title" dangerouslySetInnerHTML=${{ __html: t.feed_locked_title }}></h2>
          <div class="section-line"></div>
          <div class="feed-empty"><span class="icon">🔒</span><p>${t.feed_locked_desc}</p></div>
        </div>
      </div>`;
  }

  /* ─────────────────────────────
     App Root
  ───────────────────────────── */
  function App() {
    const [lang, setLang] = useState(() => {
      try { return localStorage.getItem('ditibozhi_lang') || 'en'; } catch { return 'en'; }
    });
    const [page, setPage] = useState(() => location.hash.replace('#', '') || HOME_PAGE);
    const [user, setUser] = useState(() => typeof authGetCurrentUser === 'function' ? authGetCurrentUser() : null);
    const [showAuth, setShowAuth] = useState(false);

    const t = I18N[lang] || I18N.en;

    const navigate = useCallback(p => {
      setPage(p);
      location.hash = p;
      window.scrollTo(0, 0);
    }, []);

    const applyLang = useCallback(l => {
      setLang(l);
      try { localStorage.setItem('ditibozhi_lang', l); } catch {}
      document.documentElement.lang = l;
    }, []);

    // handle browser back/forward
    useEffect(() => {
      const fn = () => setPage(location.hash.replace('#', '') || HOME_PAGE);
      window.addEventListener('hashchange', fn);
      return () => window.removeEventListener('hashchange', fn);
    }, []);

    // expose openAuthModal globally (used in page components)
    useEffect(() => { window.openAuthModal = () => setShowAuth(true); }, []);

    const ctx = { lang, t, applyLang, user, setUser, showAuth, setShowAuth, navigate };

    return html`
      <${Ctx.Provider} value=${ctx}>
        <${Nav} page=${page} navigate=${navigate}/>
        <main>
          ${FEED_LOCKED && page === 'feed' ? html`<${FeedLocked}/>` : html`<${PageLoader} page=${page}/>`}
        </main>
        <${Footer}/>
        ${showAuth && html`<${AuthModal}/>`}
      <//>`;
  }

  /* ─────────────────────────────
     Mount
  ───────────────────────────── */
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App}/>`);
})();
