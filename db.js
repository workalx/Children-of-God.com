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

    // Один лайк на людину: документ названо «пост_користувач», тож другий поставити неможливо
    async setLike(postId, on) {
      const user = Auth.user();
      const { db, mod } = await fs();
      const ref = mod.doc(db, 'likes', likeId(postId, user.id));
      await (on ? mod.setDoc(ref, { postId, uid: user.id }) : mod.deleteDoc(ref));
    },
  };
})();
