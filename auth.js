/* ══════════════════════════════════════
   AUTH.JS — Реєстрація та вхід
   ══════════════════════════════════════ */

const AUTH_USERS_KEY   = 'ditibozhi_users';
const AUTH_SESSION_KEY = 'ditibozhi_session';

// ── Зберігання ──
function authGetUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); } catch(e) { return []; }
}
function authSaveUsers(users) {
  try { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); } catch(e) {}
}

// Проста хеш-функція (не для продакшну, але достатньо для статичного сайту)
function authHash(str) {
  return btoa(unescape(encodeURIComponent(str + ':ditibozhi2026')));
}

// ── Реєстрація ──
function authRegister(username, email, password) {
  const users = authGetUsers();
  username = username.trim();
  email    = email.trim().toLowerCase();

  if (!username || username.length < 2)      return { ok: false, msg: { uk:'Ім\'я мінімум 2 символи', en:'Name must be at least 2 characters', ru:'Имя минимум 2 символа' } };
  if (!email || !email.includes('@'))         return { ok: false, msg: { uk:'Невірний email', en:'Invalid email', ru:'Неверный email' } };
  if (!password || password.length < 4)      return { ok: false, msg: { uk:'Пароль мінімум 4 символи', en:'Password at least 4 characters', ru:'Пароль минимум 4 символа' } };
  if (users.find(u => u.email === email))     return { ok: false, msg: { uk:'Цей email вже зареєстровано', en:'This email is already registered', ru:'Этот email уже зарегистрирован' } };
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return { ok: false, msg: { uk:'Це ім\'я вже зайнято', en:'This username is taken', ru:'Это имя уже занято' } };

  const user = { id: Date.now(), username, email, passwordHash: authHash(password), joinedAt: new Date().toLocaleDateString('uk-UA') };
  users.push(user);
  authSaveUsers(users);
  authStartSession(user);
  return { ok: true, user };
}

// ── Вхід ──
function authLogin(email, password) {
  const users = authGetUsers();
  email = email.trim().toLowerCase();
  const user = users.find(u => u.email === email && u.passwordHash === authHash(password));
  if (!user) return { ok: false, msg: { uk:'Невірний email або пароль', en:'Invalid email or password', ru:'Неверный email или пароль' } };
  authStartSession(user);
  return { ok: true, user };
}

// ── Сесія ──
function authStartSession(user) {
  try { sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ id: user.id, username: user.username, email: user.email })); } catch(e) {}
}
function authGetCurrentUser() {
  try { const s = sessionStorage.getItem(AUTH_SESSION_KEY); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}
function authLogout() {
  try { sessionStorage.removeItem(AUTH_SESSION_KEY); } catch(e) {}
}
function authIsLoggedIn() { return !!authGetCurrentUser(); }

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
