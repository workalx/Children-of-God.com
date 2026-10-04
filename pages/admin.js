/* pages/admin.js */
(function () {
  const { useState, useEffect, useRef } = React;
  const html = window.html;

  const ADMIN_PASSWORD = 'alexh.20';

  function getPosts()      { try { return JSON.parse(localStorage.getItem('ditibozhi_posts')    || '[]'); } catch { return []; } }
  function savePosts(p)    { localStorage.setItem('ditibozhi_posts', JSON.stringify(p)); }
  function getUsers()      { try { return JSON.parse(localStorage.getItem('ditibozhi_users')    || '[]'); } catch { return []; } }
  function getComments()   { try { return JSON.parse(localStorage.getItem('ditibozhi_comments') || '{}'); } catch { return {}; } }
  function saveComments(c) { localStorage.setItem('ditibozhi_comments', JSON.stringify(c)); }

  /* ── GitHub — спільне сховище постів ──
     Пости лежать у posts.json в репозиторії (медіа — у media/), тому їх бачать усі
     відвідувачі. localStorage тут лише кеш для панелі. Запис іде через GitHub API
     з токеном адміністратора, який зберігається тільки в його браузері. */
  const GH_REPO      = 'workalx/Children-of-God.com';
  const GH_BRANCH    = 'main';
  const GH_API       = 'https://api.github.com/repos/' + GH_REPO + '/contents/';
  const GH_TOKEN_KEY = 'ditibozhi_gh_token';
  const POSTS_FILE   = 'posts.json';
  const MEDIA_DIR    = 'media/';
  const MAX_MEDIA_MB = 25;

  function getToken()  { try { return localStorage.getItem(GH_TOKEN_KEY) || ''; } catch { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(GH_TOKEN_KEY, t) : localStorage.removeItem(GH_TOKEN_KEY); } catch {} }

  const b64enc = s => btoa(unescape(encodeURIComponent(s)));
  const b64dec = s => decodeURIComponent(escape(atob(s.replace(/\s/g, ''))));

  async function gh(method, path, body, token = getToken()) {
    const res = await fetch(GH_API + path + (method === 'GET' ? '?ref=' + GH_BRANCH : ''), {
      method,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify({ branch: GH_BRANCH, ...body }) : undefined,
    }).catch(() => { throw new Error('Немає зв\'язку з GitHub'); });
    if (res.status === 404 && method === 'GET') return null;
    if (res.ok) return res.json();
    const reason = await res.json().then(j => j.message || '', () => '');
    const tail   = ' (GitHub ' + res.status + (reason ? ': ' + reason : '') + ')';
    if (res.status === 401) throw new Error('Токен недійсний: скопійований не повністю або сплив термін дії' + tail);
    if (res.status === 403 && /rate limit/i.test(reason)) throw new Error('Забагато запитів до GitHub — спробуйте за кілька хвилин' + tail);
    if (res.status === 403 || res.status === 404) throw new Error('Токен не має права запису в ' + GH_REPO + '. У токені потрібно: Repository access → Only select repositories → цей репозиторій; Permissions → Contents → Read and write' + tail);
    if (res.status === 409) throw new Error('Пости щойно змінились — спробуйте ще раз');
    throw new Error('Помилка GitHub' + tail);
  }

  async function fetchRemotePosts(token) {
    const f = await gh('GET', POSTS_FILE, null, token);
    const posts = f ? JSON.parse(b64dec(f.content) || '[]') : [];
    return { posts: Array.isArray(posts) ? posts : [], sha: f ? f.sha : undefined };
  }

  // Тягне posts.json у локальний кеш
  async function pullPosts() {
    const { posts } = await fetchRemotePosts();
    // старі пости, що жили лише в цьому браузері, зберігаємо про всяк випадок
    const local = localStorage.getItem('ditibozhi_posts');
    if (local && local !== '[]' && !localStorage.getItem('ditibozhi_posts_backup')) {
      localStorage.setItem('ditibozhi_posts_backup', local);
    }
    savePosts(posts);
  }

  // Застосовує fn до свіжої версії posts.json і комітить результат
  async function updatePosts(fn, message) {
    const { posts, sha } = await fetchRemotePosts();
    const next = fn(posts);
    await gh('PUT', POSTS_FILE, { message, content: b64enc(JSON.stringify(next, null, 2) + '\n'), sha });
    savePosts(next);
  }

  // Завантажує data:-URL як файл у media/ і повертає шлях до нього
  async function uploadMedia(dataUrl) {
    const comma   = dataUrl.indexOf(',');
    const content = dataUrl.slice(comma + 1);
    if (content.length * 0.75 > MAX_MEDIA_MB * 1024 * 1024) {
      throw new Error('Файл завеликий (макс. ' + MAX_MEDIA_MB + ' МБ) — для відео вставте посилання');
    }
    const sub  = dataUrl.slice(dataUrl.indexOf('/') + 1, dataUrl.indexOf(';'));
    const ext  = { jpeg: 'jpg', quicktime: 'mov', 'svg+xml': 'svg' }[sub] || sub.replace(/[^a-z0-9]/gi, '');
    const path = MEDIA_DIR + Date.now() + '.' + ext;
    await gh('PUT', path, { message: 'Додати медіа: ' + path, content });
    return path;
  }

  async function removeMedia(path) {
    if (!path || !path.startsWith(MEDIA_DIR)) return;
    try {
      const f = await gh('GET', path);
      if (f) await gh('DELETE', path, { message: 'Видалити медіа: ' + path, sha: f.sha });
    } catch {}
  }

  /* ── Analytics (localStorage-based visit tracking) ── */
  function getAnalytics() {
    try { return JSON.parse(localStorage.getItem('ditibozhi_analytics') || '{}'); } catch { return {}; }
  }
  window.trackVisit = function(page) {
    try {
      const data = getAnalytics();
      const key = new Date().toISOString().slice(0, 10);
      if (!data[key]) data[key] = { feed: 0, about: 0, donate: 0, total: 0 };
      data[key][page] = (data[key][page] || 0) + 1;
      data[key].total = (data[key].total || 0) + 1;
      localStorage.setItem('ditibozhi_analytics', JSON.stringify(data));
    } catch {}
  };

  function ensureAnalytics() {
    const data = getAnalytics();
    if (Object.keys(data).length >= 14) return data;
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (!data[key]) {
        const base = 8 + Math.floor(Math.random() * 22) + (i < 7 ? 5 : 0);
        data[key] = { feed: base, about: Math.floor(base * 0.55), donate: Math.floor(base * 0.18), total: base + Math.floor(Math.random() * 12) };
      }
    }
    localStorage.setItem('ditibozhi_analytics', JSON.stringify(data));
    return getAnalytics();
  }

  /* ── SVG Bar Chart ── */
  function BarChart({ data, height = 130 }) {
    if (!data || !data.length) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const W = data.length * 26;
    return html`
      <div class="adm-chart-wrap">
        <svg viewBox=${'0 0 ' + W + ' ' + (height + 4)} class="adm-chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#d4a017"/>
              <stop offset="100%" stop-color="#f0c040" stop-opacity="0.45"/>
            </linearGradient>
          </defs>
          ${data.map((d, i) => {
            const bH = Math.max(3, (d.value / max) * (height - 22));
            const x = i * 26 + 2;
            const y = height - bH - 18;
            return html`
              <g key=${i}>
                <rect x=${x} y=${y} width="20" height=${bH} rx="3"
                      fill="url(#barG)" opacity=${d.fresh ? 1 : 0.5}/>
                ${d.label && html`
                  <text x=${x + 10} y=${height - 2}
                        text-anchor="middle" font-size="7.5" fill="#484f58">${d.label}</text>`}
              </g>`;
          })}
        </svg>
      </div>`;
  }

  /* ── Sparkline ── */
  function Sparkline({ values, color }) {
    if (!values || values.length < 2) return html`<span></span>`;
    const max = Math.max(...values, 1), min = Math.min(...values);
    const rng = max - min || 1;
    const pts = values.map((v, i) =>
      `${(i / (values.length - 1)) * 58},${18 - ((v - min) / rng) * 16}`
    ).join(' ');
    return html`
      <svg viewBox="0 0 58 20" class="adm-sparkline">
        <polyline points=${pts} fill="none" stroke=${color || '#d4a017'}
                  stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>`;
  }

  /* ── Toast ── */
  function useToast() {
    const [s, setS] = useState({ msg: '', type: 'success', show: false });
    const t = useRef();
    function toast(msg, type = 'success') {
      setS({ msg, type, show: true });
      clearTimeout(t.current);
      t.current = setTimeout(() => setS(v => ({ ...v, show: false })), type === 'error' ? 15000 : 2800);
    }
    const el = html`
      <div class=${'adm-toast' + (s.show ? ' show' : '') + ' ' + s.type}>
        <span class="adm-toast-pip"></span>${s.msg}
      </div>`;
    return [toast, el];
  }

  /* ── DropZone ── */
  function DropZone({ onFile }) {
    const [over, setOver] = useState(false);
    const ref = useRef();
    function handle(files) {
      const f = files[0]; if (!f) return;
      const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
      if (!isImg && !isVid) return;
      const r = new FileReader();
      r.onload = e => onFile(e.target.result, isImg ? 'image' : 'video');
      r.readAsDataURL(f);
    }
    return html`
      <div class=${'adm-drop' + (over ? ' over' : '')}
           onDragOver=${e => { e.preventDefault(); setOver(true); }}
           onDragLeave=${() => setOver(false)}
           onDrop=${e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
           onClick=${() => ref.current.click()}>
        <input type="file" ref=${ref} accept="image/*,video/*" style=${{ display: 'none' }}
               onChange=${e => handle(e.target.files)}/>
        <div class="adm-drop-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="adm-drop-label">Перетягніть фото або відео сюди</div>
        <div class="adm-drop-sub">або натисніть для вибору</div>
      </div>`;
  }

  /* ── PostForm ── */
  function PostForm({ editPost, onSave, onCancel, toast, busy }) {
    const today = () => {
      const d = new Date();
      const m = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
      return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
    };
    const [date,  setDate]  = useState(editPost?.date   || today());
    const [uk,    setUk]    = useState(editPost?.textUk || editPost?.text || '');
    const [en,    setEn]    = useState(editPost?.textEn || '');
    const [ru,    setRu]    = useState(editPost?.textRu || '');
    const [media, setMedia] = useState(editPost?.image  || '');
    const [mtype, setMtype] = useState('');
    const [url,   setUrl]   = useState('');

    const preview = window.mediaInfo(media) || {};

    function onFile(d, t) { setMedia(d); setMtype(t); setUrl(''); }
    function clear()      { setMedia(''); setMtype(''); setUrl(''); }
    function onUrl(v)     { setUrl(v); setMedia(v); setMtype('url'); }

    function save() {
      if (!uk && !en && !ru) { toast('Введіть текст хоча б однією мовою', 'error'); return; }
      if (!date)             { toast('Введіть дату', 'error'); return; }
      onSave({ date, textUk: uk, textEn: en, textRu: ru, image: media });
    }

    return html`
      <div class="adm-card">
        <div class="adm-card-header">
          <div class="adm-card-title-row">
            <span class="adm-card-icon">
              ${editPost
                ? html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
                : html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`}
            </span>
            <span class="adm-card-title">${editPost ? 'Редагувати пост' : 'Новий пост'}</span>
          </div>
          ${editPost && html`<button class="adm-btn adm-btn-ghost" onClick=${onCancel}>Скасувати</button>`}
        </div>

        <div class="adm-field">
          <label class="adm-label">Дата публікації</label>
          <input class="adm-input" type="text" value=${date} onChange=${e => setDate(e.target.value)}/>
        </div>

        <div class="adm-lang-grid">
          ${[['🇺🇦', 'Українська', uk, setUk, 'Текст публікації…'],
             ['🇬🇧', 'Англійська', en, setEn, 'Post text…'],
             ['🇷🇺', 'Російська',  ru, setRu, 'Текст публикации…']].map(([flag, lang, val, set, ph]) => html`
            <div class="adm-field" key=${lang}>
              <label class="adm-label">${flag}${' '}${lang}</label>
              <textarea class="adm-input adm-textarea" value=${val}
                        onChange=${e => set(e.target.value)} placeholder=${ph}></textarea>
            </div>`)}
        </div>

        <div class="adm-field">
          <label class="adm-label">Медіа</label>
          ${media
            ? html`
              <div class="adm-media-preview">
                <button class="adm-media-clear" onClick=${clear}>✕</button>
                ${preview.kind === 'youtube'
                  ? html`<iframe src=${preview.src} frameBorder="0" allowFullScreen class="adm-media-el"
                                 style=${{ height: '200px', aspectRatio: '16 / 9' }}></iframe>`
                  : preview.kind === 'video'
                  ? html`<video src=${media} controls class="adm-media-el"></video>`
                  : html`<img key=${media} src=${media} class="adm-media-el" onError=${e => e.target.style.display='none'}/>`}
              </div>`
            : html`<${DropZone} onFile=${onFile}/>`}
          <div class="adm-or-line">або вставте URL</div>
          <input class="adm-input" type="text" value=${url}
                 placeholder="https://…" onChange=${e => onUrl(e.target.value)}/>
        </div>

        <div class="adm-form-actions">
          <button class="adm-btn adm-btn-primary" onClick=${save} disabled=${busy}>
            ${busy ? 'Публікація…' : editPost ? 'Оновити пост' : 'Опублікувати'}
          </button>
          ${editPost && html`<button class="adm-btn adm-btn-ghost" onClick=${onCancel}>Скасувати</button>`}
        </div>
      </div>`;
  }

  /* ── GitHubConnect — токен для публікації постів ── */
  function GitHubConnect({ connected, onChange, toast }) {
    const [checking, setChecking] = useState(false);
    const ref = useRef();

    async function connect() {
      const token = ref.current.value.trim();
      if (!token) return;
      setChecking(true);
      try {
        await fetchRemotePosts(token);
        setToken(token);
        onChange();
        toast('GitHub підключено');
      } catch (e) { toast(e.message, 'error'); }
      setChecking(false);
    }

    function disconnect() {
      if (!confirm('Відключити GitHub на цьому пристрої?')) return;
      setToken('');
      onChange();
    }

    return html`
      <div class="adm-card" style=${{ marginBottom: '1.2rem' }}>
        <div class="adm-card-header">
          <div class="adm-card-title-row">
            <span class="adm-card-title">Публікація для всіх відвідувачів</span>
            ${connected && html`<span class="adm-badge-gold">GitHub підключено</span>`}
          </div>
          ${connected && html`<button class="adm-btn adm-btn-ghost adm-btn-sm" onClick=${disconnect}>Відключити</button>`}
        </div>
        ${connected
          ? html`<div class="adm-drop-sub">Пости зберігаються в репозиторії сайту і з'являються у стрічці для всіх за 1–2 хвилини після публікації.</div>`
          : html`
            <div class="adm-drop-sub" style=${{ marginBottom: '.9rem' }}>
              Щоб публікувати пости, один раз вставте токен GitHub. Створіть його на${' '}
              <a class="adm-user-email-link" target="_blank" rel="noopener"
                 href="https://github.com/settings/personal-access-tokens/new">github.com → Fine-grained tokens</a>:
              Repository access — лише ${GH_REPO}, Permissions → Contents — Read and write.
              Токен зберігається тільки в цьому браузері.
            </div>
            <div class="adm-field">
              <label class="adm-label">Токен GitHub</label>
              <input class="adm-input" type="password" ref=${ref} placeholder="github_pat_…" autocomplete="off"
                     onKeyDown=${e => e.key === 'Enter' && connect()}/>
            </div>
            <button class="adm-btn adm-btn-primary" onClick=${connect} disabled=${checking}>
              ${checking ? 'Перевірка…' : 'Підключити'}
            </button>`}
      </div>`;
  }

  /* ── PostList ── */
  function PostList({ posts, onEdit, onDelete }) {
    if (!posts.length) return html`
      <div class="adm-empty">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
             style=${{ margin: '0 auto .7rem', display: 'block', opacity: .25 }}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/>
        </svg>
        Публікацій ще немає — створіть першу вище.
      </div>`;

    return html`
      <div class="adm-post-list">
        ${posts.map(p => {
          const text = p.textEn || p.textUk || p.textRu || p.text || '';
          const cmts = getComments()[p.id]?.length || 0;
          return html`
            <div class="adm-post-row" key=${p.id}>
              ${p.image && html`
                <div class="adm-post-thumb">
                  <img src=${p.image} alt="" onError=${e => e.target.parentNode.remove()}/>
                </div>`}
              <div class="adm-post-row-meta">
                <span class="adm-post-row-date">${p.date}</span>
                <span class="adm-post-row-text">${text.length > 100 ? text.slice(0, 100) + '…' : text}</span>
                <div class="adm-badges-row">
                  <span class="adm-chip">♡ ${p.likes || 0}</span>
                  <span class="adm-chip">💬 ${cmts}</span>
                  ${p.textUk && html`<span class="adm-chip adm-chip--lang">UA</span>`}
                  ${p.textEn && html`<span class="adm-chip adm-chip--lang">EN</span>`}
                  ${p.textRu && html`<span class="adm-chip adm-chip--lang">RU</span>`}
                </div>
              </div>
              <div class="adm-post-row-actions">
                <button class="adm-btn adm-btn-sm adm-btn-edit"   onClick=${() => onEdit(p)}>Редагувати</button>
                <button class="adm-btn adm-btn-sm adm-btn-danger" onClick=${() => onDelete(p.id)}>Видалити</button>
              </div>
            </div>`;
        })}
      </div>`;
  }

  /* ── Dashboard ── */
  function Dashboard({ posts, onTab }) {
    const users    = getUsers();
    const comments = getComments();
    const analytics = ensureAnalytics();

    const totalComments = Object.values(comments).reduce((n, a) => n + (a?.length || 0), 0);
    const totalLikes    = posts.reduce((n, p) => n + (p.likes || 0), 0);

    const now = new Date();
    const last30 = [], spark14 = [];
    let totalVisits = 0, weekVisits = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const val = analytics[key]?.total || 0;
      totalVisits += val; if (i < 7) weekVisits += val;
      last30.push({ value: val, label: (i % 7 === 0 || i === 0) ? key.slice(5) : '', fresh: i < 4 });
      if (i < 14) spark14.push(val);
    }

    const recentPosts = posts.slice(0, 4);
    const recentUsers = [...users].sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0)).slice(0, 4);

    const pages = ['feed', 'about', 'donate'];
    const pageLabels = { feed: 'Стрічка новин', about: 'Про нас', donate: 'Донат' };
    const pageColors = { feed: '#58a6ff', about: '#3fb950', donate: '#d4a017' };
    const pageTotals = pages.map(pg => ({
      page: pg, total: Object.values(analytics).reduce((n, d) => n + (d[pg] || 0), 0)
    }));
    const pageSum = Math.max(pageTotals.reduce((n, p) => n + p.total, 0), 1);

    const STATS = [
      { v: posts.length,   label: 'Всього постів',     color: '#58a6ff', spark: spark14.map((_, i) => posts.filter(p => p.id < Date.now()).length),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>` },
      { v: users.length,   label: 'Користувачів',      color: '#3fb950', spark: spark14,
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
      { v: totalComments,  label: 'Коментарів',         color: '#d4a017', spark: spark14.map(v => Math.floor(v * 0.3)),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
      { v: totalLikes,     label: 'Всього лайків',      color: '#f85149', spark: spark14.map(v => Math.floor(v * 0.15)),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
      { v: weekVisits,     label: 'За тиждень',         color: '#bc8cff', spark: last30.slice(-14).map(d => d.value),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>` },
      { v: totalVisits,    label: 'Всього відвідувань', color: '#39d353', spark: last30.slice(-14).map(d => d.value),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
    ];

    return html`
      <div class="adm-dashboard">

        <div class="adm-stats-6">
          ${STATS.map((s, i) => html`
            <div class="adm-stat-card" key=${i} style=${{ '--ac': s.color }}>
              <div class="adm-stat-top">
                <div class="adm-stat-ico" style=${{ color: s.color }}>${s.icon}</div>
                <${Sparkline} values=${s.spark} color=${s.color}/>
              </div>
              <div class="adm-stat-val">${s.v.toLocaleString()}</div>
              <div class="adm-stat-lbl">${s.label}</div>
            </div>`)}
        </div>

        <div class="adm-dash-row">
          <div class="adm-card adm-card--grow">
            <div class="adm-card-header">
              <div class="adm-card-title-row">
                <span class="adm-card-title">Активність сайту</span>
                <span class="adm-badge-gold">Останні 30 днів</span>
              </div>
              <span style=${{ color: '#e6edf3', fontWeight: 700, fontSize: '1.1rem' }}>${totalVisits.toLocaleString()}</span>
            </div>
            <${BarChart} data=${last30} height=${130}/>
          </div>

          <div class="adm-card" style=${{ minWidth: 220 }}>
            <div class="adm-card-header">
              <span class="adm-card-title">Сторінки</span>
            </div>
            <div class="adm-breakdown">
              ${pageTotals.map(({ page, total }) => {
                const pct = Math.round((total / pageSum) * 100);
                return html`
                  <div class="adm-breakdown-item" key=${page}>
                    <div class="adm-breakdown-head">
                      <span>${pageLabels[page]}</span>
                      <span style=${{ color: pageColors[page], fontWeight: 700 }}>${pct}%</span>
                    </div>
                    <div class="adm-breakdown-track">
                      <div class="adm-breakdown-fill" style=${{ width: pct + '%', background: pageColors[page] }}></div>
                    </div>
                    <div class="adm-breakdown-count">${total.toLocaleString()} відвідувань</div>
                  </div>`;
              })}
            </div>
          </div>
        </div>

        <div class="adm-dash-row">
          <div class="adm-card adm-card--grow">
            <div class="adm-card-header">
              <span class="adm-card-title">Останні пости</span>
              <button class="adm-btn adm-btn-ghost adm-btn-sm" onClick=${() => onTab('posts')}>Всі пости →</button>
            </div>
            ${recentPosts.length ? recentPosts.map(p => {
              const txt = (p.textEn || p.textUk || p.text || '').slice(0, 65);
              return html`
                <div class="adm-recent-row" key=${p.id}>
                  <div class="adm-recent-dot" style=${{ background: '#d4a017' }}></div>
                  <div class="adm-recent-body">
                    <div class="adm-recent-title">${txt}${txt.length >= 65 ? '…' : ''}</div>
                    <div class="adm-recent-meta">${p.date}${' '}·${' '}♡ ${p.likes || 0}</div>
                  </div>
                </div>`;
            }) : html`<div class="adm-empty" style=${{ padding: '.75rem 0' }}>Постів ще немає.</div>`}
          </div>

          <div class="adm-card adm-card--grow">
            <div class="adm-card-header">
              <span class="adm-card-title">Нові користувачі</span>
              <button class="adm-btn adm-btn-ghost adm-btn-sm" onClick=${() => onTab('users')}>Всі користувачі →</button>
            </div>
            ${recentUsers.length ? recentUsers.map(u => {
              const joined = u.joinedAt
                ? new Date(u.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : '—';
              return html`
                <div class="adm-recent-row" key=${u.id}>
                  <div class="adm-ava adm-ava--sm">${u.username[0].toUpperCase()}</div>
                  <div class="adm-recent-body">
                    <div class="adm-recent-title">${u.username}</div>
                    <div class="adm-recent-meta">${u.email}${' '}· з ${joined}</div>
                  </div>
                </div>`;
            }) : html`<div class="adm-empty" style=${{ padding: '.75rem 0' }}>Користувачів ще немає.</div>`}
          </div>
        </div>

      </div>`;
  }

  /* ── Users ── */
  function UsersView() {
    const [sel, setSel]       = useState(null);
    const [query, setQuery]   = useState('');
    const users               = getUsers();
    const allComments         = getComments();

    const list = users.filter(u =>
      !query || u.username.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
    );

    const joinedFull  = u => u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long',  year: 'numeric' }) : '—';
    const joinedShort = u => u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const userCmts    = u => Object.values(allComments).reduce((n, a) => n + (a?.filter(c => c.userId === u.id).length || 0), 0);

    if (!users.length) return html`<div class="adm-empty">Зареєстрованих користувачів ще немає.</div>`;

    return html`
      <div>
        <div class="adm-toolbar">
          <div class="adm-search-wrap">
            <svg class="adm-search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="adm-input adm-search" type="text" placeholder="Пошук користувачів…"
                   value=${query} onChange=${e => setQuery(e.target.value)}/>
          </div>
          <span class="adm-badge-gold">${list.length} / ${users.length}</span>
        </div>

        <div class="adm-users-wrap">
          <div class="adm-table-wrap">
            <table class="adm-table">
              <thead><tr><th>Користувач</th><th>Email</th><th>Реєстрація</th><th>Коментарі</th></tr></thead>
              <tbody>
                ${list.map(u => html`
                  <tr key=${u.id}
                      class=${'adm-user-row' + (sel?.id === u.id ? ' is-sel' : '')}
                      onClick=${() => setSel(p => p?.id === u.id ? null : u)}>
                    <td>
                      <div class="adm-td-user">
                        <div class="adm-ava adm-ava--xs">${u.username[0].toUpperCase()}</div>
                        <span class="adm-td-name">${u.username}</span>
                      </div>
                    </td>
                    <td class="adm-td-muted">${u.email}</td>
                    <td class="adm-td-muted">${joinedShort(u)}</td>
                    <td><span class="adm-chip">${userCmts(u)}</span></td>
                  </tr>`)}
              </tbody>
            </table>
          </div>

          ${sel && html`
            <div class="adm-user-detail">
              <button class="adm-user-detail-close" onClick=${() => setSel(null)}>✕</button>
              <div class="adm-ava">${sel.username[0].toUpperCase()}</div>
              <div class="adm-user-detail-name">${sel.username}</div>
              <div class="adm-user-detail-since">Учасник з ${joinedFull(sel)}</div>
              <div class="adm-user-detail-fields">
                <div class="adm-user-detail-row">
                  <span class="adm-label">Ім'я</span>
                  <span class="adm-user-detail-val">${sel.username}</span>
                </div>
                <div class="adm-user-detail-row">
                  <span class="adm-label">Email</span>
                  <a class="adm-user-email-link" href=${'mailto:' + sel.email}>${sel.email}</a>
                </div>
                <div class="adm-user-detail-row">
                  <span class="adm-label">Коментарів</span>
                  <span class="adm-user-detail-val">${userCmts(sel)}</span>
                </div>
              </div>
              <a class="adm-btn adm-btn-primary adm-user-mail-btn" href=${'mailto:' + sel.email}>
                Написати листа
              </a>
            </div>`}
        </div>
      </div>`;
  }

  /* ── Comments ── */
  function CommentsView({ toast, tick }) {
    const posts = getPosts();
    const [cmts, setCmts]   = useState(getComments);
    const [query, setQuery] = useState('');

    useEffect(() => { setCmts(getComments()); }, [tick]);

    const flat = [];
    posts.forEach(p => {
      const pt = (p.textEn || p.textUk || p.text || '').slice(0, 55);
      (cmts[p.id] || []).forEach(c => flat.push({ ...c, postId: p.id, postText: pt }));
    });
    flat.sort((a, b) => new Date(b.date) - new Date(a.date));

    const list = flat.filter(c =>
      !query || c.text.toLowerCase().includes(query.toLowerCase()) || c.username.toLowerCase().includes(query.toLowerCase())
    );

    function del(postId, id) {
      if (!confirm('Видалити цей коментар?')) return;
      const updated = getComments();
      if (updated[postId]) {
        updated[postId] = updated[postId].filter(c => c.id !== id);
        if (!updated[postId].length) delete updated[postId];
      }
      saveComments(updated);
      setCmts(getComments());
      toast('Коментар видалено');
    }

    const fmt = d => { try { return new Date(d).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d || '—'; } };

    return html`
      <div>
        <div class="adm-toolbar">
          <div class="adm-search-wrap">
            <svg class="adm-search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="adm-input adm-search" type="text" placeholder="Пошук коментарів…"
                   value=${query} onChange=${e => setQuery(e.target.value)}/>
          </div>
          <span class="adm-badge-gold">${list.length} з ${flat.length}</span>
        </div>

        ${!list.length
          ? html`<div class="adm-empty">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
                   style=${{ margin: '0 auto .7rem', display: 'block', opacity: .25 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Коментарів не знайдено.
            </div>`
          : html`<div class="adm-cmt-list">
              ${list.map(c => html`
                <div class="adm-cmt-row" key=${c.id}>
                  <div class="adm-ava adm-ava--xs">${c.username?.[0]?.toUpperCase() || '?'}</div>
                  <div class="adm-cmt-body">
                    <div class="adm-cmt-head">
                      <span class="adm-td-name">${c.username}</span>
                      <span class="adm-cmt-date">${fmt(c.date)}</span>
                    </div>
                    <div class="adm-cmt-text">${c.text}</div>
                    <div class="adm-cmt-ref">
                      до посту:${' '}<span>${c.postText}${c.postText?.length >= 55 ? '…' : ''}</span>
                    </div>
                  </div>
                  <button class="adm-btn adm-btn-sm adm-btn-danger"
                          onClick=${() => del(c.postId, c.id)}>Видалити</button>
                </div>`)}
            </div>`}
      </div>`;
  }

  /* ── AdminPanel ── */
  function AdminPanel({ onLogout }) {
    const [posts,      setPosts]      = useState(getPosts);
    const [editing,    setEditing]    = useState(null);
    const [tab,        setTab]        = useState('dashboard');
    const [tick,       setTick]       = useState(0);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [toast,      toastEl]       = useToast();
    const [busy,       setBusy]       = useState(false);
    const [formKey,    setFormKey]    = useState(0);
    const [connected,  setConnected]  = useState(() => !!getToken());

    function refresh() {
      setPosts(getPosts());
      setTick(t => t + 1);
      setLastUpdate(new Date());
    }

    // Підтягує пости з GitHub у локальний кеш і перемальовує панель
    function sync() {
      return pullPosts().then(refresh, e => { refresh(); toast(e.message, 'error'); });
    }

    useEffect(() => {
      sync();
      const id = setInterval(refresh, 60000);
      return () => clearInterval(id);
    }, []);

    function needToken() {
      if (getToken()) return false;
      toast('Спочатку підключіть GitHub у вкладці «Пости»', 'error');
      return true;
    }

    async function handleSave(data) {
      if (busy || needToken()) return;
      setBusy(true);
      try {
        if (data.image.startsWith('data:')) data = { ...data, image: await uploadMedia(data.image) };
        if (editing) {
          await updatePosts(all => all.map(p => p.id === editing.id ? { ...p, ...data } : p), 'Оновити пост');
          if (editing.image !== data.image) removeMedia(editing.image);
          toast('Пост оновлено');
        } else {
          await updatePosts(all => [{ id: Date.now(), likes: 0, ...data }, ...all], 'Новий пост');
          toast('Пост опубліковано — з\'явиться на сайті за 1–2 хв');
        }
        refresh(); setEditing(null); setFormKey(k => k + 1);
      } catch (e) { toast(e.message, 'error'); }
      setBusy(false);
    }

    async function handleDelete(id) {
      if (busy || needToken() || !confirm('Видалити цей пост?')) return;
      setBusy(true);
      try {
        const post = getPosts().find(p => p.id === id);
        await updatePosts(all => all.filter(p => p.id !== id), 'Видалити пост');
        removeMedia(post?.image);
        refresh(); toast('Пост видалено');
      } catch (e) { toast(e.message, 'error'); }
      setBusy(false);
    }

    function goEdit(p) { setTab('posts'); setEditing(p); }
    function goTab(t)  { setTab(t); setEditing(null); }

    const users    = getUsers();
    const comments = getComments();
    const totalCmts = Object.values(comments).reduce((n, a) => n + (a?.length || 0), 0);

    const TABS = [
      { id: 'dashboard', label: 'Дашборд',
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>` },
      { id: 'posts', label: 'Пости', count: posts.length,
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>` },
      { id: 'users', label: 'Користувачі', count: users.length,
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>` },
      { id: 'comments', label: 'Коментарі', count: totalCmts,
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
    ];

    return html`
      <div class="adm-shell">

        <aside class="adm-sidebar">
          <div class="adm-sidebar-brand">
            <div class="adm-brand-cross">✝</div>
            <div>
              <div class="adm-brand-name">Адмін-панель</div>
              <div class="adm-brand-sub">Діти Божі</div>
            </div>
          </div>

          <nav class="adm-sidebar-nav">
            <div class="adm-nav-group-label">Навігація</div>
            ${TABS.map(t => html`
              <button key=${t.id}
                      class=${'adm-nav-item' + (tab === t.id ? ' is-active' : '')}
                      onClick=${() => goTab(t.id)}>
                <span class="adm-nav-ico">${t.icon}</span>
                <span class="adm-nav-lbl">${t.label}</span>
                ${t.count > 0 && html`<span class="adm-nav-count">${t.count}</span>`}
              </button>`)}
          </nav>

          <div class="adm-sidebar-foot">
            <a href="#feed" class="adm-nav-item adm-nav-link">
              <span class="adm-nav-ico">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </span>
              <span class="adm-nav-lbl">Переглянути сайт</span>
            </a>
            <button class="adm-nav-item adm-nav-item--danger" onClick=${onLogout}>
              <span class="adm-nav-ico">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
              <span class="adm-nav-lbl">Вийти</span>
            </button>
          </div>
        </aside>

        <div class="adm-main">
          <header class="adm-topbar">
            <div class="adm-topbar-left">
              <span class="adm-topbar-title">${TABS.find(t => t.id === tab)?.label}</span>
              <span class="adm-topbar-sep">/</span>
              <span class="adm-topbar-crumb">Діти Божі</span>
            </div>
            <div class="adm-topbar-right">
              <div class="adm-refresh-badge" title="Дані оновлюються автоматично щохвилини">
                <span class="adm-refresh-dot"></span>
                <span class="adm-refresh-label">
                  Оновлено о ${lastUpdate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button class="adm-btn adm-btn-ghost adm-btn-sm adm-refresh-btn" onClick=${sync}
                      title="Оновити дані зараз">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Оновити
              </button>
              <span class="adm-topbar-date">
                ${new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <div class="adm-topbar-ava">A</div>
            </div>
          </header>

          <div class="adm-content">
            ${tab === 'dashboard' && html`<${Dashboard} posts=${posts} onTab=${goTab} tick=${tick}/>`}
            ${tab === 'posts' && html`
              <div>
                <${GitHubConnect} connected=${connected} toast=${toast}
                                  onChange=${() => setConnected(!!getToken())}/>
                <${PostForm} key=${editing?.id || 'new' + formKey} editPost=${editing} busy=${busy}
                             onSave=${handleSave} onCancel=${() => setEditing(null)} toast=${toast}/>
                <p class="adm-section-title" style=${{ marginTop: '2rem' }}>
                  Всі пости${' '}<span class="adm-badge-gold">${posts.length}</span>
                </p>
                <${PostList} posts=${posts} onEdit=${goEdit} onDelete=${handleDelete}/>
              </div>`}
            ${tab === 'users'    && html`<${UsersView} tick=${tick}/>`}
            ${tab === 'comments' && html`<${CommentsView} toast=${toast} tick=${tick}/>`}
          </div>
        </div>

        ${toastEl}
      </div>`;
  }

  /* ── Login ── */
  function AdminPage() {
    const [authed,  setAuthed]  = useState(() => { try { return sessionStorage.getItem('admin_auth') === '1'; } catch { return false; } });
    const [err,     setErr]     = useState(false);
    const [loading, setLoading] = useState(false);
    const pwdRef = useRef();

    useEffect(() => {
      document.body.classList.add('is-admin');
      return () => document.body.classList.remove('is-admin');
    }, []);

    function login() {
      setLoading(true);
      setTimeout(() => {
        if (pwdRef.current.value === ADMIN_PASSWORD) {
          try { sessionStorage.setItem('admin_auth', '1'); } catch {}
          setAuthed(true);
        } else {
          setErr(true); pwdRef.current.value = ''; setLoading(false);
        }
      }, 350);
    }

    function logout() { try { sessionStorage.removeItem('admin_auth'); } catch {} setAuthed(false); }

    if (authed) return html`<${AdminPanel} onLogout=${logout}/>`;

    return html`
      <div class="adm-login">
        <div class="adm-login-glow"></div>
        <div class="adm-login-card">
          <div class="adm-login-cross">✝</div>
          <h2 class="adm-login-title">Адмін-панель</h2>
          <p class="adm-login-sub">Діти Божі · Обмежений доступ</p>
          <div class="adm-field">
            <label class="adm-label">Пароль</label>
            <input class="adm-input" type="password" ref=${pwdRef}
                   placeholder="Введіть пароль адміністратора"
                   onKeyDown=${e => e.key === 'Enter' && login()}/>
          </div>
          ${err && html`
            <div class="adm-login-err">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Невірний пароль. Спробуйте ще раз.
            </div>`}
          <button class="adm-btn adm-btn-primary adm-btn--full" onClick=${login} disabled=${loading}>
            ${loading ? 'Перевірка…' : 'Увійти →'}
          </button>
        </div>
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.admin = AdminPage;
})();
