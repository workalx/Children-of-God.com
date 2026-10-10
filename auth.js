/* ══════════════════════════════════════
   AUTH.JS — Акаунти через Firebase Authentication
   ══════════════════════════════════════ */

// Налаштування проєкту Firebase. Це не секрет: доступ обмежують правила на боці Firebase
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB3S_jnFabrt8rvRo__VufwVXN3DxVCIaA',
  authDomain: 'children-of-god-97184.firebaseapp.com',
  projectId: 'children-of-god-97184',
  storageBucket: 'children-of-god-97184.firebasestorage.app',
  messagingSenderId: '574102264102',
  appId: '1:574102264102:web:a93664b9bbcf3b04cf89e7',
};
const FIREBASE_SDK  = 'https://www.gstatic.com/firebasejs/13.0.0/firebase-';
const AUTH_USER_KEY = 'ditibozhi_user';

const Auth = (function () {
  // Останній відомий користувач — щоб кнопка входу не блимала, поки вантажиться Firebase
  let current = null;
  try { current = JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch (e) {}
  let lang = 'en';
  let registering = false;
  const subs = new Set();

  // Локальна розробка: localStorage.ditibozhi_emulator = '1' спрямовує вхід на емулятор Firebase
  const EMULATOR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) &&
    (() => { try { return localStorage.getItem('ditibozhi_emulator') === '1'; } catch (e) { return false; } })();

  function toUser(u) {
    if (!u) return null;
    const providers = u.providerData.map(p => p.providerId);
    return {
      id: u.uid,
      username: u.displayName || (u.email || '').split('@')[0] || 'User',
      email: u.email || '',
      // вхід через Google чи GitHub уже підтверджує особу; пошту перевіряємо лише для пароля
      verified: u.emailVerified || providers.some(p => p !== 'password'),
      provider: providers[0] || 'password',
    };
  }

  function emit(u) {
    current = toUser(u);
    try {
      current ? localStorage.setItem(AUTH_USER_KEY, JSON.stringify(current)) : localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {}
    subs.forEach(fn => fn(current));
  }

  // SDK вантажиться у фоні й не затримує показ сторінки
  const ready = Promise.all([import(FIREBASE_SDK + 'app.js'), import(FIREBASE_SDK + 'auth.js')]).then(([appMod, mod]) => {
    const app  = appMod.initializeApp(FIREBASE_CONFIG);
    const auth = mod.getAuth(app);
    if (EMULATOR) mod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    mod.onAuthStateChanged(auth, u => {
      if (registering) return;   // register() сам повідомить, коли ім'я вже збережено
      emit(u);
      if (u) saveProfile(app, u);
    });
    return { app, auth, mod };
  });
  ready.catch(() => {});

  // Картка користувача у Firestore — з неї адмінка бере список зареєстрованих
  async function saveProfile(app, u) {
    if (EMULATOR) return;
    try {
      if (sessionStorage.getItem('ditibozhi_profile_saved') === u.uid) return;
      const fs = await import(FIREBASE_SDK + 'firestore.js');
      const me = toUser(u);
      await fs.setDoc(fs.doc(fs.getFirestore(app), 'users', u.uid), {
        username: me.username,
        email: me.email,
        provider: me.provider,
        joinedAt: fs.Timestamp.fromDate(new Date(u.metadata.creationTime)),
        lastLoginAt: fs.serverTimestamp(),
      }, { merge: true });
      sessionStorage.setItem('ditibozhi_profile_saved', u.uid);
    } catch (e) { console.warn('Не вдалося зберегти профіль:', e.message); }
  }

  // Коди помилок Firebase → ключі перекладів auth_err_*
  const ERRORS = {
    'auth/invalid-credential': 'bad_login', 'auth/wrong-password': 'bad_login', 'auth/user-not-found': 'bad_login',
    'auth/user-disabled': 'bad_login',
    'auth/email-already-in-use': 'email_taken',
    'auth/invalid-email': 'bad_email', 'auth/missing-email': 'bad_email',
    'auth/weak-password': 'weak_password', 'auth/missing-password': 'weak_password',
    'auth/too-many-requests': 'too_many',
    'auth/network-request-failed': 'network',
    'auth/popup-closed-by-user': 'cancelled', 'auth/cancelled-popup-request': 'cancelled', 'auth/user-cancelled': 'cancelled',
    'auth/popup-blocked': 'popup_blocked',
    'auth/account-exists-with-different-credential': 'other_provider',
    'auth/unauthorized-domain': 'not_enabled', 'auth/operation-not-allowed': 'not_enabled',
    'auth/configuration-not-found': 'not_enabled',
  };
  const fail = key => new Error(key);

  async function call(fn) {
    let fb;
    try { fb = await ready; } catch (e) { throw fail('network'); }
    fb.auth.languageCode = lang;   // мова листів і вікна входу
    try { return await fn(fb); }
    catch (e) {
      if (!e.code) throw e;
      console.warn('Firebase Auth:', e.code);
      throw fail(ERRORS[e.code] || 'unknown');
    }
  }

  return {
    user: () => current,
    setLang(l) { lang = l; },

    // Викликає fn при кожній зміні користувача; повертає функцію відписки
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },

    register(username, email, password) {
      username = String(username || '').trim();
      if (username.length < 2 || username.length > 40) return Promise.reject(fail('bad_name'));
      return call(async ({ app, auth, mod }) => {
        registering = true;
        try {
          const { user } = await mod.createUserWithEmailAndPassword(auth, String(email).trim(), password);
          await mod.updateProfile(user, { displayName: username });
        } finally {
          registering = false;
          // акаунт уже створено, навіть якщо далі щось зірвалось — сайт має показати, що людина увійшла
          if (auth.currentUser) emit(auth.currentUser);
        }
        saveProfile(app, auth.currentUser);
        // якщо лист не пішов, вікно підтвердження покаже помилку й кнопку «Надіслати ще раз»
        await mod.sendEmailVerification(auth.currentUser);
        return current;
      });
    },

    login(email, password) {
      return call(async ({ auth, mod }) => toUser((await mod.signInWithEmailAndPassword(auth, String(email).trim(), password)).user));
    },

    loginWith(name) {
      return call(async ({ auth, mod }) => {
        const provider = name === 'github' ? new mod.GithubAuthProvider() : new mod.GoogleAuthProvider();
        return toUser((await mod.signInWithPopup(auth, provider)).user);
      });
    },

    logout() { return call(({ auth, mod }) => mod.signOut(auth)); },

    resetPassword(email) {
      return call(({ auth, mod }) => mod.sendPasswordResetEmail(auth, String(email).trim()));
    },

    resendVerification() {
      return call(({ auth, mod }) => auth.currentUser && mod.sendEmailVerification(auth.currentUser));
    },

    // Перечитує акаунт із Firebase — так сайт дізнається, що пошту підтверджено
    refresh() {
      return call(async ({ auth, mod }) => {
        if (!auth.currentUser) return null;
        await mod.reload(auth.currentUser);
        await auth.currentUser.getIdToken(true);
        emit(auth.currentUser);
        return current;
      });
    },
  };
})();

function authGetCurrentUser() { return Auth.user(); }

// ── Коментарі ──
const COMMENTS_KEY = 'ditibozhi_comments';

function commentsGet(postId) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    return all[postId] || [];
  } catch(e) { return []; }
}
function commentsAdd(postId, text) {
  const user = authGetCurrentUser();
  if (!user) return false;
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    if (!all[postId]) all[postId] = [];
    all[postId].push({
      id: Date.now(),
      userId: user.id,
      username: user.username,
      text: text.trim(),
      date: new Date().toLocaleDateString('uk-UA')
    });
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    return true;
  } catch(e) { return false; }
}
function commentsDelete(postId, commentId) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    if (all[postId]) all[postId] = all[postId].filter(c => c.id !== commentId);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  } catch(e) {}
}
