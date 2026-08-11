/* pages/feed.js — завантажується тільки при переході на стрічку */
(function () {
  const { useState, useEffect, useCallback, useContext } = React;
  const html = window.html;
  const Ctx  = window.useApp;

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── helpers ── */
  function getPosts() {
    try { const r = localStorage.getItem('ditibozhi_posts'); return r ? JSON.parse(r) : []; } catch { return []; }
  }
  function getPostText(p, lang) {
    if (lang === 'uk') return p.textUk || p.text || '';
    if (lang === 'en') return p.textEn || p.textUk || p.text || '';
    if (lang === 'ru') return p.textRu || p.textUk || p.text || '';
    return p.textUk || p.text || '';
  }

  /* ── Comment item ── */
  function CommentItem({ c, postId, currentUser, onDelete }) {
    return html`
      <div class="comment-item">
        <div class="comment-avatar">${c.username.charAt(0).toUpperCase()}</div>
        <div class="comment-body">
          <div class="comment-username">${escHtml(c.username)}</div>
          <div class="comment-text">${escHtml(c.text)}</div>
          <div class="comment-date">${c.date}</div>
        </div>
        ${currentUser && currentUser.id === c.userId && html`
          <button class="comment-del" onClick=${() => onDelete(postId, c.id)}>✕</button>`}
      </div>`;
  }

  /* ── Comments section ── */
  function Comments({ postId, lang, t, user }) {
    const [list,  setList]  = useState(() => commentsGet(postId));
    const [draft, setDraft] = useState('');

    function send() {
      if (!draft.trim()) return;
      commentsAdd(postId, draft.trim());
      setList(commentsGet(postId));
      setDraft('');
    }
    function del(pid, cid) {
      commentsDelete(pid, cid);
      setList(commentsGet(postId));
    }

    return html`
      <div class="comments-section">
        <div class="comments-list">
          ${list.map(c => html`
            <${CommentItem} key=${c.id} c=${c} postId=${postId} currentUser=${user} onDelete=${del}/>`)}
        </div>
        ${user
          ? html`
            <div class="comment-input-row">
              <input class="comment-input" value=${draft}
                     placeholder=${t.comment_placeholder}
                     onChange=${e => setDraft(e.target.value)}
                     onKeyDown=${e => e.key==='Enter' && send()}/>
              <button class="comment-send" onClick=${send}>➤</button>
            </div>`
          : html`
            <div class="comment-login-prompt"
                 dangerouslySetInnerHTML=${{ __html: t.comment_login.replace('<a>', '<a onclick="openAuthModal()" style="cursor:pointer;color:var(--gold);font-weight:700">')}}>
            </div>`}
      </div>`;
  }

  /* ── Post card ── */
  function PostCard({ p, idx, lang, t, user, navLogo }) {
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(p.likes || 0);
    const postId = String(p.id || idx);
    const text   = getPostText(p, lang);

    function toggleLike() {
      const next = !liked;
      setLiked(next);
      setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    }

    const media = p.image
      ? (p.image.startsWith('data:video') || /\.(mp4|webm|mov|ogg)$/i.test(p.image)
          ? html`<video class="post-image" src=${p.image} controls style=${{ maxHeight: '480px', width: '100%' }}></video>`
          : html`<img class="post-image" src=${p.image} alt="" loading="lazy" onError=${e=>e.target.style.display='none'}/>`)
      : null;

    return html`
      <article class="post-card">
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
        </div>
        <${Comments} postId=${postId} lang=${lang} t=${t} user=${user}/>
      </article>`;
  }

  /* ── Feed Page ── */
  function FeedPage() {
    const { lang, t, user } = Ctx();
    const [posts, setPosts] = useState(getPosts);

    // refresh when lang or user changes (comments toggle)
    useEffect(() => { setPosts(getPosts()); }, [lang, user]);

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
          ${posts.length === 0
            ? html`<div class="feed-empty"><span class="icon">🕊️</span><p>${t.feed_empty}</p></div>`
            : posts.map((p, i) => html`
                <${PostCard} key=${p.id || i} p=${p} idx=${i} lang=${lang} t=${t} user=${user} navLogo=${t.nav_logo}/>`)}
        </div>
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.feed = FeedPage;
})();
