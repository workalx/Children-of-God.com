/* pages/feed.js — стрічка (#feed) і сторінка одного поста з усіма медіа (#post/<id>) */
(function () {
  const { useState, useEffect, useRef } = React;
  const html = window.html;
  const Ctx  = window.useApp;

  /* ── helpers ── */
  function getPostText(p, lang) {
    if (lang === 'uk') return p.textUk || p.text || '';
    if (lang === 'en') return p.textEn || p.textUk || p.text || '';
    if (lang === 'ru') return p.textRu || p.textUk || p.text || '';
    return p.textUk || p.text || '';
  }

  // Код помилки показуємо поруч із повідомленням: за ним видно, що саме відхилила база
  function saveError(e) {
    console.warn('Firestore:', e);
    return (e && (e.code || e.message)) || 'unknown';
  }

  /* ── Comment item ── */
  function CommentItem({ c, lang, currentUser, onDelete }) {
    const date = new Date(c.createdAt).toLocaleDateString({ uk: 'uk-UA', ru: 'ru-RU' }[lang] || 'en-GB');
    return html`
      <div class="comment-item">
        <div class="comment-avatar">${c.username.charAt(0).toUpperCase()}</div>
        <div class="comment-body">
          <div class="comment-username">${c.username}</div>
          <div class="comment-text">${c.text}</div>
          <div class="comment-date">${date}</div>
        </div>
        ${currentUser && currentUser.id === c.uid && html`
          <button class="comment-del" onClick=${() => onDelete(c.id)}>✕</button>`}
      </div>`;
  }

  /* ── Comments section ── */
  function Comments({ postId, lang, t, user }) {
    const { blocked } = Ctx();
    const [list,  setList]  = useState([]);
    const [draft, setDraft] = useState('');
    const [busy,  setBusy]  = useState(false);
    const [failed, setFailed] = useState('');   // код помилки Firebase, якщо зберегти не вдалося

    useEffect(() => {
      let alive = true;
      Db.comments(postId).then(l => { if (alive) setList(l); }, saveError);
      return () => { alive = false; };
    }, [postId]);

    async function send() {
      const text = draft.trim();
      if (!text || busy) return;
      setBusy(true);
      try {
        const c = await Db.addComment(postId, text);
        setList(l => [...l, c]);
        setDraft(''); setFailed('');
      } catch (e) { setFailed(saveError(e)); }
      setBusy(false);
    }
    async function del(id) {
      try {
        await Db.deleteComment(id);
        setList(l => l.filter(c => c.id !== id));
        setFailed('');
      } catch (e) { setFailed(saveError(e)); }
    }

    return html`
      <div class="comments-section">
        <div class="comments-list">
          ${list.map(c => html`
            <${CommentItem} key=${c.id} c=${c} lang=${lang} currentUser=${user} onDelete=${del}/>`)}
        </div>
        ${failed && html`<div class="comment-error">${t.comment_error} (${failed})</div>`}
        ${blocked
          ? html`<div class="comment-login-prompt">${t.comment_blocked}</div>`
          : user && user.verified
          ? html`
            <div class="comment-input-row">
              <input class="comment-input" value=${draft} maxlength="1000"
                     placeholder=${t.comment_placeholder}
                     onChange=${e => setDraft(e.target.value)}
                     onKeyDown=${e => e.key==='Enter' && send()}/>
              <button class="comment-send" onClick=${send} disabled=${busy}>➤</button>
            </div>`
          : html`
            <div class="comment-login-prompt"
                 dangerouslySetInnerHTML=${{ __html: (user ? t.comment_verify : t.comment_login).replace('<a>', '<a onclick="openAuthModal()" style="cursor:pointer;color:var(--gold);font-weight:700">')}}>
            </div>`}
      </div>`;
  }

  /* ── Одне медіа на всю ширину (пост з одним медіа, лайтбокс) ── */
  function MediaFull({ src, cls, autoPlay }) {
    const m = window.mediaInfo(src);
    if (!m) return null;
    if (m.kind === 'youtube') return html`
      <iframe class=${cls} src=${m.src} loading="lazy" frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen" allowFullScreen
              style=${{ aspectRatio: '16 / 9', maxHeight: 'none', width: cls === 'lightbox-img' ? 'min(90vw, 150vh)' : '100%' }}></iframe>`;
    if (m.kind === 'video') return html`
      <video class=${cls} src=${m.src} controls autoPlay=${autoPlay} playsInline
             style=${cls === 'post-image' ? { maxHeight: '480px', width: '100%' } : null}></video>`;
    return html`<img class=${cls} src=${m.src} alt="" loading="lazy" onError=${e=>e.target.style.display='none'}/>`;
  }

  /* ── Плитка-мініатюра в сітці ── */
  function MediaTile({ src, more, onClick }) {
    const m = window.mediaInfo(src);
    return html`
      <button class="post-tile" onClick=${onClick}>
        ${m.kind === 'video'
          ? html`<video src=${m.src} muted playsInline preload="metadata"></video>`
          : html`<img src=${m.kind === 'youtube' ? m.thumb : m.src} alt="" loading="lazy"
                      onError=${e=>e.target.style.visibility='hidden'}/>`}
        ${m.kind !== 'image' && html`<span class="post-tile-play">▶</span>`}
        ${more > 0 && html`<span class="post-tile-more">+${more}</span>`}
      </button>`;
  }

  /* ── Lightbox — перегляд медіа поста на весь екран ── */
  function Lightbox({ items, start, onClose }) {
    const [idx, setIdx] = useState(start);
    const touchX = useRef(null);
    const step = d => setIdx(i => (i + d + items.length) % items.length);

    useEffect(() => {
      const fn = e => {
        if (e.key === 'Escape')     onClose();
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft')  step(-1);
      };
      document.addEventListener('keydown', fn);
      return () => document.removeEventListener('keydown', fn);
    }, [items.length]);

    // свайп на телефоні
    function onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }

    return html`
      <div class="lightbox-overlay" onClick=${e => e.target === e.currentTarget && onClose()}
           onTouchStart=${e => { touchX.current = e.touches[0].clientX; }} onTouchEnd=${onTouchEnd}>
        <button class="lightbox-close" onClick=${onClose}>✕</button>
        ${items.length > 1 && html`<button class="lightbox-prev" onClick=${() => step(-1)}>‹</button>`}
        <div class="lightbox-img-wrap">
          <${MediaFull} key=${idx} src=${items[idx]} cls="lightbox-img" autoPlay=${true}/>
          <div class="lightbox-counter">${idx + 1} / ${items.length}</div>
        </div>
        ${items.length > 1 && html`<button class="lightbox-next" onClick=${() => step(1)}>›</button>`}
      </div>`;
  }

  /* ── Post card ──
     У стрічці показує обрані 1–4 медіа і кнопку «Переглянути все»;
     full — сторінка поста з усіма медіа */
  function PostCard({ p, idx, lang, t, user, navLogo, full }) {
    const { navigate, blocked } = Ctx();
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(0);
    const [open,  setOpen]  = useState(null);   // індекс медіа в лайтбоксі
    const [likeFailed, setLikeFailed] = useState('');
    const postId = String(p.id || idx);
    const uid    = user ? user.id : null;

    // лічильник спільний для всіх; після входу чи виходу перечитуємо, чи є тут мій лайк
    useEffect(() => {
      let alive = true;
      Db.likes(postId).then(r => { if (alive) { setLikes(r.count); setLiked(r.mine); } }, saveError);
      return () => { alive = false; };
    }, [postId, uid]);
    const text   = getPostText(p, lang);
    const all    = window.postMedia(p);
    const shown  = full ? all : window.postPreview(p);

    function openPost() {
      window.__feedReturnTo = postId;
      navigate('post/' + postId);
    }

    function toggleLike() {
      if (!user) { window.openAuthModal(); return; }
      if (blocked) return;
      const next = !liked;
      const show = on => { setLiked(on); setLikes(l => Math.max(0, l + (on ? 1 : -1))); };
      show(next); setLikeFailed('');
      // показуємо одразу; якщо зберегти не вдалося — повертаємо як було
      Db.setLike(postId, next).catch(e => { show(!next); setLikeFailed(saveError(e)); });
    }

    const media = all.length === 0 ? null
      : all.length === 1
        ? html`<${MediaFull} src=${all[0]} cls="post-image"/>`
      : full
        ? html`
          <div class="post-grid post-grid--all">
            ${all.map((src, i) => html`<${MediaTile} key=${src} src=${src} onClick=${() => setOpen(i)}/>`)}
          </div>`
        : html`
          <div class=${'post-grid post-grid--' + shown.length}>
            ${shown.map((src, i) => html`
              <${MediaTile} key=${src} src=${src} onClick=${openPost}
                            more=${i === shown.length - 1 ? all.length - shown.length : 0}/>`)}
          </div>
          <button class="post-view-all" onClick=${openPost}>
            ${t.post_view_all} <span>${all.length}</span>
          </button>`;

    return html`
      <article class="post-card" id=${'post-' + postId}>
        <div class="post-header">
          <div class="post-avatar">✝</div>
          <div class="post-meta">
            <div class="post-author">${navLogo}</div>
            <div class="post-date">📅 ${p.date}</div>
          </div>
        </div>
        ${media}
        <div class="post-body"><p class="post-text">${text}</p></div>
        <div class="post-footer">
          <button class=${'post-like' + (liked ? ' liked' : '')} onClick=${toggleLike}>
            <span>${liked ? '❤️' : '🤍'}</span> <span>${likes}</span>
          </button>
          ${likeFailed && html`<span class="comment-error">${t.comment_error} (${likeFailed})</span>`}
        </div>
        <${Comments} postId=${postId} lang=${lang} t=${t} user=${user}/>
        ${open !== null && html`<${Lightbox} items=${all} start=${open} onClose=${() => setOpen(null)}/>`}
      </article>`;
  }

  function usePosts() {
    const [posts, setPosts] = useState(null);
    useEffect(() => {
      let alive = true;
      window.loadPosts().then(p => { if (alive) setPosts(p); });
      return () => { alive = false; };
    }, []);
    return posts;
  }

  /* ── Feed Page ── */
  function FeedPage() {
    const { lang, t, user } = Ctx();
    const posts = usePosts();

    // після повернення зі сторінки поста — назад до того самого місця стрічки
    useEffect(() => {
      const el = posts && window.__feedReturnTo && document.getElementById('post-' + window.__feedReturnTo);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (posts) window.__feedReturnTo = null;
    }, [posts]);

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
          <h2 class="section-title" dangerouslySetInnerHTML=${{ __html: t.feed_title }}></h2>
          <div class="section-line"></div>
          ${!posts
            ? html`<div class="page-loader">⏳</div>`
            : posts.length === 0
            ? html`<div class="feed-empty"><span class="icon">🕊️</span><p>${t.feed_empty}</p></div>`
            : posts.map((p, i) => html`
                <${PostCard} key=${p.id || i} p=${p} idx=${i} lang=${lang} t=${t} user=${user} navLogo=${t.nav_logo}/>`)}
        </div>
      </div>`;
  }

  /* ── Post Page (#post/<id>) — пост з усіма медіа ── */
  function PostPage({ param }) {
    const { lang, t, user, navigate } = Ctx();
    const posts = usePosts();
    const idx   = posts ? posts.findIndex((x, i) => String(x.id || i) === param) : -1;

    return html`
      <div class="feed-wrap">
        <a class="post-back" href="#feed" onClick=${e => { e.preventDefault(); navigate('feed'); }}>${t.post_back}</a>
        ${!posts
          ? html`<div class="page-loader">⏳</div>`
          : idx < 0
          ? html`<div class="feed-empty"><span class="icon">🕊️</span><p>${t.post_not_found}</p></div>`
          : html`<${PostCard} full=${true} p=${posts[idx]} idx=${idx} lang=${lang} t=${t} user=${user} navLogo=${t.nav_logo}/>`}
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.feed = FeedPage;
  window.Pages.post = PostPage;
})();
