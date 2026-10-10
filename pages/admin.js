/* pages/admin.js */
(function () {
  const { useState, useEffect, useRef } = React;
  const html = window.html;

  function getPosts()      { try { return JSON.parse(localStorage.getItem('ditibozhi_posts')    || '[]'); } catch { return []; } }
  function savePosts(p)    { localStorage.setItem('ditibozhi_posts', JSON.stringify(p)); }
  // Користувачі, коментарі й лайки приходять із Firestore (Db.adminData); це вигляд «ще не завантажено»
  const NO_DATA = { users: [], comments: [], likes: {}, likesTotal: 0, likeTimes: [], stats: {}, blocked: [] };
  // сторінка консолі Firebase, де акаунт можна видалити остаточно
  const FB_USERS_URL = 'https://console.firebase.google.com/project/' + FIREBASE_CONFIG.projectId + '/authentication/users';

  /* ── GitHub — спільне сховище постів ──
     Пости лежать у posts.json в репозиторії (медіа — у media/), тому їх бачать усі
     відвідувачі. localStorage тут лише кеш для панелі. Запис іде через GitHub API
     з токеном адміністратора, який зберігається тільки в його браузері. */
  const GH_REPO      = 'workalx/Children-of-God.com';
  const GH_BRANCH    = 'main';
  const GH_API       = 'https://api.github.com/repos/' + GH_REPO + '/contents/';
  const GH_RAW       = 'https://raw.githubusercontent.com/' + GH_REPO + '/' + GH_BRANCH + '/';
  const GH_TOKEN_KEY = 'ditibozhi_gh_token';
  const POSTS_FILE   = 'posts.json';
  const MEDIA_DIR    = 'media/';
  const MAX_MEDIA_MB = 25;
  const MAX_PREVIEW  = 4;      // скільки медіа показує картка поста у стрічці
  const MAX_SIDE     = 2000;   // фото з камери стискаються до цієї довшої сторони

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
  async function uploadMedia(dataUrl, n = 0) {
    const comma   = dataUrl.indexOf(',');
    const content = dataUrl.slice(comma + 1);
    if (content.length * 0.75 > MAX_MEDIA_MB * 1024 * 1024) {
      throw new Error('Файл завеликий (макс. ' + MAX_MEDIA_MB + ' МБ) — для відео вставте посилання');
    }
    const sub  = dataUrl.slice(dataUrl.indexOf('/') + 1, dataUrl.indexOf(';'));
    const ext  = { jpeg: 'jpg', quicktime: 'mov', 'svg+xml': 'svg' }[sub] || sub.replace(/[^a-z0-9]/gi, '');
    const path = MEDIA_DIR + Date.now() + '-' + n + '.' + ext;
    await gh('PUT', path, { message: 'Додати медіа: ' + path, content });
    return path;
  }

  // Видаляє файли з media/ по одному: паралельні коміти в одну гілку конфліктували б
  async function removeMedia(paths) {
    for (const path of paths) {
      if (!path || !path.startsWith(MEDIA_DIR)) continue;
      try {
        const f = await gh('GET', path);
        if (f) await gh('DELETE', path, { message: 'Видалити медіа: ' + path, sha: f.sha });
      } catch {}
    }
  }

  // Читає файл як data:-URL. Великі фото зменшує до MAX_SIDE і перекодовує в JPEG:
  // знімок з камери важить 2–3 МБ, а в пості їх буває з десяток
  function readFile(f) {
    return new Promise(resolve => {
      const asIs = () => {
        const r = new FileReader();
        r.onload  = e => resolve(e.target.result);
        r.onerror = () => resolve(null);
        r.readAsDataURL(f);
      };
      if (!f.type.startsWith('image/') || /gif|svg/.test(f.type) || f.size < 700 * 1024) return asIs();
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width  = Math.round(img.naturalWidth  * k);
        c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); asIs(); };
      img.src = url;
    });
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
                      fill="url(#barG)" opacity=${d.fresh ? 1 : 0.5}>
                  <title>${d.title}</title>
                </rect>
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
  function DropZone({ onFiles }) {
    const [over, setOver] = useState(false);
    const [reading, setReading] = useState(false);
    const ref = useRef();
    async function handle(files) {
      const list = [...files].filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      if (!list.length) return;
      setReading(true);
      const out = [];
      for (const f of list) out.push(await readFile(f));
      setReading(false);
      ref.current.value = '';
      onFiles(out.filter(Boolean));
    }
    return html`
      <div class=${'adm-drop' + (over ? ' over' : '')}
           onDragOver=${e => { e.preventDefault(); setOver(true); }}
           onDragLeave=${() => setOver(false)}
           onDrop=${e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
           onClick=${() => ref.current.click()}>
        <input type="file" ref=${ref} accept="image/*,video/*" multiple style=${{ display: 'none' }}
               onChange=${e => handle(e.target.files)}/>
        <div class="adm-drop-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="adm-drop-label">${reading ? 'Обробка файлів…' : 'Перетягніть фото або відео сюди'}</div>
        <div class="adm-drop-sub">або натисніть для вибору — можна одразу кілька</div>
      </div>`;
  }

  /* ── PostForm ── */
  function PostForm({ editPost, onSave, onCancel, toast, busy, progress }) {
    const today = () => {
      const d = new Date();
      const m = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
      return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
    };
    const [date,  setDate]  = useState(editPost?.date   || today());
    const [uk,    setUk]    = useState(editPost?.textUk || editPost?.text || '');
    const [en,    setEn]    = useState(editPost?.textEn || '');
    const [ru,    setRu]    = useState(editPost?.textRu || '');
    const [url,   setUrl]   = useState('');
    // усі медіа поста по порядку; featured — показувати на картці у стрічці
    const [items, setItems] = useState(() => {
      const shown = window.postPreview(editPost);
      return window.postMedia(editPost).map(src => ({ src, featured: shown.includes(src) }));
    });
    const featured = items.filter(i => i.featured).length;

    // нові медіа стають «у стрічці», доки не набереться MAX_PREVIEW
    function withAdded(cur, srcs) {
      const next = [...cur];
      srcs.forEach(src => {
        if (src && !next.some(i => i.src === src)) {
          next.push({ src, featured: next.filter(i => i.featured).length < MAX_PREVIEW });
        }
      });
      return next;
    }
    function add(srcs)   { setItems(cur => withAdded(cur, srcs)); }
    function addUrl()    { if (url.trim()) { add([url.trim()]); setUrl(''); } }
    function remove(src) { setItems(cur => cur.filter(i => i.src !== src)); }
    function toggle(it) {
      if (!it.featured && featured >= MAX_PREVIEW) {
        toast('У стрічці показується не більше ' + MAX_PREVIEW + ' медіа — спершу зніміть ★ з іншого', 'error');
        return;
      }
      setItems(cur => cur.map(i => i.src === it.src ? { ...i, featured: !i.featured } : i));
    }
    function move(i, d) {
      setItems(cur => {
        const j = i + d;
        if (j < 0 || j >= cur.length) return cur;
        const next = [...cur];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    }

    function save() {
      if (!uk && !en && !ru) { toast('Введіть текст хоча б однією мовою', 'error'); return; }
      if (!date)             { toast('Введіть дату', 'error'); return; }
      // посилання, яке вставили, але не натиснули «Додати»
      const list = withAdded(items, [url.trim()]);
      onSave({
        date, textUk: uk, textEn: en, textRu: ru,
        media:   list.map(i => i.src),
        preview: list.filter(i => i.featured).map(i => i.src),
      });
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
          <label class="adm-label">Медіа${items.length ? ' · ' + items.length : ''}</label>
          ${items.length > 0 && html`
            <div class="adm-media-grid">
              ${items.map((it, i) => html`
                <div class=${'adm-media-tile' + (it.featured ? ' is-featured' : '')} key=${it.src}>
                  <${PostThumb} src=${it.src} cls="adm-media-tile-img"/>
                  <button class="adm-media-clear" title="Прибрати з поста" onClick=${() => remove(it.src)}>✕</button>
                  <button class="adm-media-star" onClick=${() => toggle(it)}
                          title=${it.featured ? 'Показується на картці у стрічці — натисніть, щоб прибрати' : 'Показувати на картці у стрічці'}>
                    ${it.featured ? '★ У стрічці' : '☆ У стрічці'}
                  </button>
                  <div class="adm-media-move">
                    <button title="Перемістити раніше" disabled=${i === 0} onClick=${() => move(i, -1)}>‹</button>
                    <span>${i + 1}</span>
                    <button title="Перемістити далі" disabled=${i === items.length - 1} onClick=${() => move(i, 1)}>›</button>
                  </div>
                </div>`)}
            </div>
            <div class="adm-drop-sub" style=${{ margin: '.5rem 0 .8rem' }}>
              ★ — медіа на картці у стрічці (обрано ${featured} з ${MAX_PREVIEW}). Усі ${items.length} відкриваються
              кнопкою «Переглянути все». Стрілки ‹ › змінюють порядок.
            </div>`}
          <${DropZone} onFiles=${add}/>
          <div class="adm-or-line">або вставте URL</div>
          <div class="adm-url-row">
            <input class="adm-input" type="text" value=${url} placeholder="https://… (фото, відео або YouTube)"
                   onChange=${e => setUrl(e.target.value)} onKeyDown=${e => e.key === 'Enter' && addUrl()}/>
            <button class="adm-btn adm-btn-ghost" onClick=${addUrl}>Додати</button>
          </div>
        </div>

        <div class="adm-form-actions">
          <button class="adm-btn adm-btn-primary" onClick=${save} disabled=${busy}>
            ${busy ? (progress || 'Публікація…') : editPost ? 'Оновити пост' : 'Опублікувати'}
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

  /* ── PostThumb — мініатюра поста у списку ── */
  function PostThumb({ src, cls = 'adm-post-thumb' }) {
    const [fails, setFails] = useState(0);
    const m = window.mediaInfo(src);
    if (!m) return null;
    // щойно завантажений файл ще не на сайті (Pages оновлюється 1–2 хв) — беремо його прямо з репозиторію
    const inRepo = m.kind !== 'youtube' && m.src.startsWith(MEDIA_DIR);
    if (fails > (inRepo ? 1 : 0)) return null;
    const url    = m.kind === 'youtube' ? m.thumb : fails ? GH_RAW + m.src : m.src;
    const onFail = () => setFails(n => n + 1);
    return html`
      <div class=${cls}>
        ${m.kind === 'video'
          ? html`<video src=${url} muted preload="metadata" onError=${onFail}></video>`
          : html`<img src=${url} alt="" onError=${onFail}/>`}
      </div>`;
  }

  /* ── PostList ── */
  function PostList({ posts, data, onEdit, onDelete }) {
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
          const cmts = data.comments.filter(c => c.postId === String(p.id)).length;
          const media = window.postMedia(p);
          return html`
            <div class="adm-post-row" key=${p.id}>
              <${PostThumb} key=${media[0]} src=${media[0]}/>
              <div class="adm-post-row-meta">
                <span class="adm-post-row-date">${p.date}</span>
                <span class="adm-post-row-text">${text.length > 100 ? text.slice(0, 100) + '…' : text}</span>
                <div class="adm-badges-row">
                  <span class="adm-chip">♡ ${data.likes[p.id] || 0}</span>
                  <span class="adm-chip">💬 ${cmts}</span>
                  ${media.length > 1 && html`<span class="adm-chip">🖼 ${media.length}</span>`}
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
  function Dashboard({ posts, data, onTab }) {
    const users = data.users;

    // останні 30 днів, від найдавнішого до сьогодні; ключ дня — той самий, що в лічильниках (UTC)
    const dayKey = ms => new Date(ms).toISOString().slice(0, 10);
    const days   = [];
    for (let i = 29; i >= 0; i--) days.push(dayKey(Date.now() - i * 864e5));
    const stat   = (day, field) => (data.stats[day] && data.stats[day][field]) || 0;
    const sum    = (list, field) => list.reduce((n, day) => n + stat(day, field), 0);
    // скільки подій (реєстрацій, коментарів, лайків) припало на кожен із останніх 14 днів
    const perDay = times => days.slice(-14).map(day => times.filter(t => t && dayKey(t) === day).length);

    const monthViews   = sum(days, 'views');
    const weekVisitors = sum(days.slice(-7), 'visitors');
    const last30 = days.map((day, i) => ({
      value: stat(day, 'views'),
      title: day + ': ' + stat(day, 'views') + ' переглядів, ' + stat(day, 'visitors') + ' відвідувачів',
      label: ((29 - i) % 7 === 0) ? day.slice(5) : '',
      fresh: i >= 26,
    }));

    const recentPosts = posts.slice(0, 4);
    const recentUsers = [...users].sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0)).slice(0, 4);

    const pages = ['feed', 'about', 'gallery', 'videos', 'donate'];
    const pageLabels = { feed: 'Стрічка новин', about: 'Про нас', gallery: 'Галерея', videos: 'Відео', donate: 'Донат' };
    const pageColors = { feed: '#58a6ff', about: '#3fb950', gallery: '#bc8cff', videos: '#f85149', donate: '#d4a017' };
    const pageTotals = pages.map(pg => ({ page: pg, total: sum(days, pg) }));
    const pageSum = Math.max(pageTotals.reduce((n, p) => n + p.total, 0), 1);

    const STATS = [
      { v: posts.length,   label: 'Всього постів',     color: '#58a6ff', spark: perDay(posts.map(p => p.id)),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>` },
      { v: users.length,   label: 'Користувачів',      color: '#3fb950', spark: perDay(users.map(u => u.joinedAt)),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
      { v: data.comments.length, label: 'Коментарів',   color: '#d4a017', spark: perDay(data.comments.map(c => c.createdAt)),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
      { v: data.likesTotal, label: 'Всього лайків',     color: '#f85149', spark: perDay(data.likeTimes),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
      { v: weekVisitors,   label: 'Відвідувачів за тиждень', color: '#bc8cff', spark: days.slice(-14).map(day => stat(day, 'visitors')),
        icon: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>` },
      { v: monthViews,     label: 'Переглядів за 30 днів', color: '#39d353', spark: last30.slice(-14).map(d => d.value),
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
                <span class="adm-card-title">Перегляди сторінок</span>
                <span class="adm-badge-gold">Останні 30 днів</span>
              </div>
              <span style=${{ color: '#e6edf3', fontWeight: 700, fontSize: '1.1rem' }}>${monthViews.toLocaleString()}</span>
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
                    <div class="adm-breakdown-count">${total.toLocaleString()} переглядів</div>
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
                    <div class="adm-recent-meta">${p.date}${' '}·${' '}♡ ${data.likes[p.id] || 0}</div>
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
  function UsersView({ data, toast, onChange }) {
    const [sel, setSel]       = useState(null);
    const [query, setQuery]   = useState('');
    const [busy, setBusy]     = useState(false);
    const isBlocked           = u => data.blocked.includes(u.id);
    const me                  = Auth.user();
    const users               = [...data.users].sort((a, b) => b.joinedAt - a.joinedAt);
    const PROVIDERS           = { password: 'Email і пароль', 'google.com': 'Google', 'github.com': 'GitHub' };

    const list = users.filter(u =>
      !query || u.username.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
    );

    const joinedFull  = u => u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long',  year: 'numeric' }) : '—';
    const joinedShort = u => u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const userCmts    = u => data.comments.filter(c => c.uid === u.id).length;
    const lastSeen    = u => u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

    // кожна дія: блокуємо кнопки, показуємо результат, перечитуємо дані з бази
    async function act(fn, done) {
      if (busy) return;
      setBusy(true);
      try { toast(done(await fn())); }
      catch (e) { toast('Не вдалося (' + (e.code || e.message) + ')', 'error'); }
      await onChange();
      setBusy(false);
    }
    function toggleBlock(u) {
      const on = !isBlocked(u);
      if (on && !confirm('Заблокувати ' + u.username + '? Людина не зможе коментувати й ставити лайки.')) return;
      act(() => Db.setBlocked(u.id, on), () => on ? 'Користувача заблоковано' : 'Користувача розблоковано');
    }
    function wipeComments(u) {
      if (!confirm('Видалити всі коментарі користувача ' + u.username + ' (' + userCmts(u) + ')? Це не можна скасувати.')) return;
      act(() => Db.deleteUserComments(u.id), n => 'Видалено коментарів: ' + n);
    }

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
                        ${isBlocked(u) && html`<span class="adm-chip adm-chip--blocked">заблоковано</span>`}
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
                  <span class="adm-label">Останній вхід</span>
                  <span class="adm-user-detail-val">${lastSeen(sel)}</span>
                </div>
                <div class="adm-user-detail-row">
                  <span class="adm-label">Спосіб входу</span>
                  <span class="adm-user-detail-val">${PROVIDERS[sel.provider] || sel.provider || '—'}</span>
                </div>
                <div class="adm-user-detail-row">
                  <span class="adm-label">Коментарів</span>
                  <span class="adm-user-detail-val">${userCmts(sel)}</span>
                </div>
              </div>
              <a class="adm-btn adm-btn-primary adm-user-mail-btn" href=${'mailto:' + sel.email}>
                Написати листа
              </a>
              ${me && me.id === sel.id
                ? html`<div class="adm-user-note">Це ваш акаунт.</div>`
                : html`
                  <button class=${'adm-btn adm-user-mail-btn ' + (isBlocked(sel) ? 'adm-btn-ghost' : 'adm-btn-danger')}
                          disabled=${busy} onClick=${() => toggleBlock(sel)}>
                    ${isBlocked(sel) ? 'Розблокувати' : 'Заблокувати'}
                  </button>`}
              ${userCmts(sel) > 0 && html`
                <button class="adm-btn adm-btn-danger adm-user-mail-btn" disabled=${busy} onClick=${() => wipeComments(sel)}>
                  Видалити всі коментарі (${userCmts(sel)})
                </button>`}
              <a class="adm-user-note" href=${FB_USERS_URL} target="_blank" rel="noopener">
                Видалити акаунт остаточно можна в консолі Firebase →
              </a>
            </div>`}
        </div>
      </div>`;
  }

  /* ── Comments ── */
  function CommentsView({ toast, data, onChange }) {
    const posts = getPosts();
    const [query, setQuery] = useState('');

    const postText = {};
    posts.forEach(p => { postText[p.id] = (p.textEn || p.textUk || p.text || '').slice(0, 55); });
    const flat = data.comments.map(c => ({ ...c, postText: postText[c.postId] || 'видалений пост' }));

    const list = flat.filter(c =>
      !query || c.text.toLowerCase().includes(query.toLowerCase()) || c.username.toLowerCase().includes(query.toLowerCase())
    );

    async function del(id) {
      if (!confirm('Видалити цей коментар?')) return;
      try {
        await Db.deleteComment(id);
        toast('Коментар видалено');
      } catch (e) { toast('Не вдалося видалити коментар (' + (e.code || e.message) + ')', 'error'); }
      onChange();
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
                      <span class="adm-cmt-date">${fmt(c.createdAt)}</span>
                    </div>
                    <div class="adm-cmt-text">${c.text}</div>
                    <div class="adm-cmt-ref">
                      до посту:${' '}<span>${c.postText}${c.postText?.length >= 55 ? '…' : ''}</span>
                    </div>
                  </div>
                  <button class="adm-btn adm-btn-sm adm-btn-danger"
                          onClick=${() => del(c.id)}>Видалити</button>
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
    const [progress,   setProgress]   = useState('');
    const [formKey,    setFormKey]    = useState(0);
    const [connected,  setConnected]  = useState(() => !!getToken());
    const [data,       setData]       = useState(NO_DATA);

    // власні візити адміністратора в статистику не йдуть
    useEffect(() => { try { localStorage.setItem('ditibozhi_no_track', '1'); } catch {} }, []);

    function refresh() {
      setPosts(getPosts());
      setTick(t => t + 1);
      setLastUpdate(new Date());
    }

    // Користувачі, коментарі й лайки з Firestore
    function loadData() {
      return Db.adminData().then(setData, e => toast('Не вдалося завантажити дані з бази (' + (e.code || e.message) + ')', 'error'));
    }

    // Підтягує пости з GitHub у локальний кеш і перемальовує панель
    function sync() {
      loadData();
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
      let uploaded = [];   // файли, які треба прибрати, якщо публікація зірветься
      try {
        const fresh = data.media.filter(s => s.startsWith('data:'));
        const paths = {};
        for (let i = 0; i < fresh.length; i++) {
          setProgress('Завантаження медіа ' + (i + 1) + ' з ' + fresh.length + '…');
          paths[fresh[i]] = await uploadMedia(fresh[i], i);
          uploaded.push(paths[fresh[i]]);
        }
        setProgress('');
        const media   = data.media.map(s => paths[s] || s);
        const preview = data.preview.map(s => paths[s] || s);
        // image — перше медіа картки: для мініатюр і для старих версій стрічки
        const post = { ...data, media, preview, image: preview[0] || media[0] || '' };
        if (editing) {
          await updatePosts(all => all.map(p => p.id === editing.id ? { ...p, ...post } : p), 'Оновити пост');
          uploaded = [];
          toast('Пост оновлено');
          await removeMedia(window.postMedia(editing).filter(s => !media.includes(s)));
        } else {
          await updatePosts(all => [{ id: Date.now(), likes: 0, ...post }, ...all], 'Новий пост');
          uploaded = [];
          toast('Пост опубліковано — з\'явиться на сайті за 1–2 хв');
        }
        refresh(); setEditing(null); setFormKey(k => k + 1);
      } catch (e) {
        toast(e.message, 'error');
        await removeMedia(uploaded);
      }
      setProgress(''); setBusy(false);
    }

    async function handleDelete(id) {
      if (busy || needToken() || !confirm('Видалити цей пост?')) return;
      setBusy(true);
      try {
        const post = getPosts().find(p => p.id === id);
        await updatePosts(all => all.filter(p => p.id !== id), 'Видалити пост');
        refresh(); toast('Пост видалено');
        await removeMedia(window.postMedia(post));
      } catch (e) { toast(e.message, 'error'); }
      setBusy(false);
    }

    function goEdit(p) { setTab('posts'); setEditing(p); }
    function goTab(t)  { setTab(t); setEditing(null); }

    const TABS = [
      { id: 'dashboard', label: 'Дашборд',
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>` },
      { id: 'posts', label: 'Пости', count: posts.length,
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>` },
      { id: 'users', label: 'Користувачі', count: data.users.length,
        icon: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>` },
      { id: 'comments', label: 'Коментарі', count: data.comments.length,
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
            ${tab === 'dashboard' && html`<${Dashboard} posts=${posts} data=${data} onTab=${goTab} tick=${tick}/>`}
            ${tab === 'posts' && html`
              <div>
                <${GitHubConnect} connected=${connected} toast=${toast}
                                  onChange=${() => setConnected(!!getToken())}/>
                <${PostForm} key=${editing?.id || 'new' + formKey} editPost=${editing} busy=${busy} progress=${progress}
                             onSave=${handleSave} onCancel=${() => setEditing(null)} toast=${toast}/>
                <p class="adm-section-title" style=${{ marginTop: '2rem' }}>
                  Всі пости${' '}<span class="adm-badge-gold">${posts.length}</span>
                </p>
                <${PostList} posts=${posts} data=${data} onEdit=${goEdit} onDelete=${handleDelete}/>
              </div>`}
            ${tab === 'users'    && html`<${UsersView} data=${data} toast=${toast} onChange=${loadData}/>`}
            ${tab === 'comments' && html`<${CommentsView} toast=${toast} data=${data} onChange=${loadData}/>`}
          </div>
        </div>

        ${toastEl}
      </div>`;
  }

  /* ── Вхід — панель відкривається акаунту, записаному у Firestore як адміністратор ── */
  function AdminPage() {
    const { user } = window.useApp();
    const uid = user ? user.id : null;
    // null — ще перевіряємо; true / false — відповідь бази
    const [admin, setAdmin] = useState(null);

    useEffect(() => {
      document.body.classList.add('is-admin');
      return () => document.body.classList.remove('is-admin');
    }, []);

    useEffect(() => {
      let alive = true;
      setAdmin(null);
      if (uid) Db.isAdmin().then(ok => { if (alive) setAdmin(ok); }, () => { if (alive) setAdmin(false); });
      return () => { alive = false; };
    }, [uid]);

    const logout = () => Auth.logout().catch(() => {});

    if (user && admin) return html`<${AdminPanel} onLogout=${logout}/>`;

    return html`
      <div class="adm-login">
        <div class="adm-login-glow"></div>
        <div class="adm-login-card">
          <div class="adm-login-cross">✝</div>
          <h2 class="adm-login-title">Адмін-панель</h2>
          <p class="adm-login-sub">Діти Божі · Обмежений доступ</p>
          ${!user ? html`
            <button class="adm-btn adm-btn-primary adm-btn--full" onClick=${() => window.openAuthModal()}>
              Увійти →
            </button>
          ` : admin === null ? html`
            <p class="adm-login-sub">Перевірка доступу…</p>
          ` : html`
            <div class="adm-login-err">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Акаунт ${user.email} не має доступу до панелі.
            </div>
            <button class="adm-btn adm-btn-ghost adm-btn--full" onClick=${logout}>Вийти й увійти іншим акаунтом</button>
          `}
        </div>
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.admin = AdminPage;
})();
