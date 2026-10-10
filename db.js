/* ══════════════════════════════════════
   DB.JS — Коментарі й лайки у Firestore, спільні для всіх відвідувачів
   ══════════════════════════════════════ */

const Db = (function () {
  // Firestore вантажиться лише коли справді потрібен — уперше при відкритті стрічки
  let ready = null;
  function fs() {
    return ready || (ready = Promise.all([Auth.app(), import(FIREBASE_SDK + 'firestore-lite.js')])
      .then(([app, mod]) => ({ db: mod.getFirestore(app), mod }))
      .catch(e => { ready = null; throw e; }));
  }

  const likeId = (postId, uid) => postId + '_' + uid;

  // Сторінки, які рахує статистика; сторінка поста йде в залік стрічки
  const TRACKED = { feed: 'feed', post: 'feed', about: 'about', donate: 'donate', gallery: 'gallery', videos: 'videos' };
  const today   = () => new Date().toISOString().slice(0, 10);

  return {
    // Коментарі до поста, від старих до нових
    async comments(postId) {
      const { db, mod } = await fs();
      const snap = await mod.getDocs(mod.query(mod.collection(db, 'comments'), mod.where('postId', '==', postId)));
      return snap.docs
        .map(d => ({ ...d.data(), id: d.id, createdAt: d.data().createdAt ? d.data().createdAt.toMillis() : Date.now() }))
        .sort((a, b) => a.createdAt - b.createdAt);
    },

    async addComment(postId, text) {
      const user = Auth.user();
      const { db, mod } = await fs();
      const data = { postId, uid: user.id, username: user.username, text };
      const ref  = await mod.addDoc(mod.collection(db, 'comments'), { ...data, createdAt: mod.serverTimestamp() });
      return { ...data, id: ref.id, createdAt: Date.now() };
    },

    async deleteComment(id) {
      const { db, mod } = await fs();
      await mod.deleteDoc(mod.doc(db, 'comments', id));
    },

    // Скільки лайків у поста і чи є серед них лайк поточного користувача
    async likes(postId) {
      const user = Auth.user();
      const { db, mod } = await fs();
      const [count, mine] = await Promise.all([
        mod.getCount(mod.query(mod.collection(db, 'likes'), mod.where('postId', '==', postId))),
        user ? mod.getDoc(mod.doc(db, 'likes', likeId(postId, user.id))) : null,
      ]);
      return { count: count.data().count, mine: !!mine && mine.exists() };
    },

    // Чи заблоковано поточного користувача: тоді база не прийме від нього ні коментар, ні лайк
    async amBlocked() {
      const user = Auth.user();
      if (!user) return false;
      const { db, mod } = await fs();
      return (await mod.getDoc(mod.doc(db, 'blocked', user.id))).exists();
    },

    // ── Статистика ──

    // Зараховує перегляд сторінки в лічильник за сьогодні (stats/РРРР-ММ-ДД).
    // Браузер, у якому відкривали адмінку, не рахується — щоб власні візити не псували цифри
    async track(pageName) {
      const page = TRACKED[pageName];
      try {
        // локальна розробка теж не рахується
        if (!page || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
        if (localStorage.getItem('ditibozhi_no_track') === '1') return;
        const day   = today();
        const first = localStorage.getItem('ditibozhi_seen') !== day;   // перший візит цього браузера за добу
        const { db, mod } = await fs();
        await mod.setDoc(mod.doc(db, 'stats', day), {
          views: mod.increment(1),
          [page]: mod.increment(1),
          ...(first ? { visitors: mod.increment(1) } : {}),
        }, { merge: true });
        if (first) localStorage.setItem('ditibozhi_seen', day);
      } catch (e) { console.warn('Статистика:', e.code || e.message); }
    },

    // ── Адмінка ──

    // Адміністратор — той, чий акаунт записано в колекції admins
    async isAdmin() {
      const user = Auth.user();
      if (!user) return false;
      const { db, mod } = await fs();
      return (await mod.getDoc(mod.doc(db, 'admins', user.id))).exists();
    },

    // Усе, що показує панель: користувачі, коментарі (нові першими) і кількість лайків на пост
    async adminData() {
      const { db, mod } = await fs();
      const all = name => mod.getDocs(mod.collection(db, name)).then(s => s.docs.map(d => ({ ...d.data(), id: d.id })));
      const ms  = t => t && t.toMillis ? t.toMillis() : 0;
      const since = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
      const recentStats = mod.getDocs(mod.query(mod.collection(db, 'stats'), mod.where(mod.documentId(), '>=', since)));
      const [users, comments, likes, statDocs, blocked] =
        await Promise.all([all('users'), all('comments'), all('likes'), recentStats,
          // поки нові правила бази не опубліковано, список блокувань недоступний — решта панелі має працювати
          all('blocked').catch(() => [])]);
      const stats = {};
      statDocs.docs.forEach(d => { stats[d.id] = d.data(); });
      const likesByPost = {};
      likes.forEach(l => { likesByPost[l.postId] = (likesByPost[l.postId] || 0) + 1; });
      return {
        users: users.map(u => ({ ...u, joinedAt: ms(u.joinedAt), lastLoginAt: ms(u.lastLoginAt) })),
        comments: comments.map(c => ({ ...c, createdAt: ms(c.createdAt) })).sort((a, b) => b.createdAt - a.createdAt),
        likes: likesByPost,
        likesTotal: likes.length,
        likeTimes: likes.map(l => ms(l.createdAt)).filter(Boolean),
        blocked: blocked.map(b => b.id),
        stats,   // лічильники відвідувань за останні 30 днів: { 'РРРР-ММ-ДД': { views, visitors, feed, … } }
      };
    },

    async setBlocked(uid, on) {
      const { db, mod } = await fs();
      const ref = mod.doc(db, 'blocked', uid);
      await (on ? mod.setDoc(ref, { by: Auth.user().id, at: mod.serverTimestamp() }) : mod.deleteDoc(ref));
    },

    // Видаляє всі коментарі користувача; повертає, скільки їх було
    async deleteUserComments(uid) {
      const { db, mod } = await fs();
      const snap = await mod.getDocs(mod.query(mod.collection(db, 'comments'), mod.where('uid', '==', uid)));
      await Promise.all(snap.docs.map(d => mod.deleteDoc(d.ref)));
      return snap.size;
    },

    // Один лайк на людину: документ названо «пост_користувач», тож другий поставити неможливо
    async setLike(postId, on) {
      const user = Auth.user();
      const { db, mod } = await fs();
      const ref = mod.doc(db, 'likes', likeId(postId, user.id));
      await (on ? mod.setDoc(ref, { postId, uid: user.id, createdAt: mod.serverTimestamp() }) : mod.deleteDoc(ref));
    },
  };
})();
