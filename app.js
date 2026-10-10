/* ══════════════════════════════════════════════
   APP.JS — React SPA (CDN + htm, без збірки)
   ══════════════════════════════════════════════ */

// htm binding — виконується після htm.js (defer-скрипти виконуються по порядку)
window.html = htm.bind(React.createElement);

(function () {
  const { useState, useEffect, useRef, useCallback, createContext, useContext, memo } = React;
  const html = window.html;

  // Блокування стрічки новин — став true, щоб тимчасово закрити розділ
  const FEED_LOCKED = false;
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
      auth_or: 'або', auth_forgot: 'Забули пароль?',
      auth_reset_sent: 'Якщо такий акаунт існує, ми надіслали лист для відновлення пароля.',
      auth_verify_title: 'Підтвердіть пошту',
      auth_verify_text: 'Ми надіслали лист на {email}. Відкрийте його й натисніть посилання, а потім поверніться сюди.',
      auth_verify_done: 'Я підтвердив', auth_verify_resend: 'Надіслати лист ще раз', auth_verify_resent: 'Лист надіслано ще раз.',
      auth_err_bad_login: 'Невірний email або пароль', auth_err_email_taken: 'Цей email вже зареєстровано',
      auth_err_bad_email: 'Невірний email', auth_err_weak_password: 'Пароль — щонайменше 6 символів',
      auth_err_bad_name: "Ім'я — від 2 до 40 символів", auth_err_too_many: 'Забагато спроб. Спробуйте за кілька хвилин.',
      auth_err_network: "Немає зв'язку. Перевірте інтернет і спробуйте ще раз.",
      auth_err_popup_blocked: 'Браузер заблокував вікно входу. Дозвольте спливні вікна для цього сайту.',
      auth_err_other_provider: 'Цей email уже використано з іншим способом входу. Увійдіть тим способом.',
      auth_err_not_enabled: 'Цей спосіб входу зараз недоступний.', auth_err_not_verified: 'Пошту ще не підтверджено. Перевірте лист, зокрема папку «Спам».',
      auth_err_unknown: 'Щось пішло не так. Спробуйте ще раз.',
      comment_verify: 'Щоб коментувати — <a>підтвердіть пошту</a>',
      comment_error: 'Не вдалося зберегти. Спробуйте ще раз.',
      footer: '© 2026 <strong>Діти Божі</strong> — Музична група. Слава Богу за кожну пісню. ✝',
      feed_tag: 'Стрічка', feed_title: 'Актуальні <span>Новини</span>',
      feed_empty: "Поки що публікацій немає. Незабаром щось з'явиться! 🙏",
      feed_locked_title: 'Розділ <span>Новини</span>',
      feed_locked_desc: 'Стрічка новин зараз готується і скоро відкриється. Слідкуйте за оновленнями! 🙏',
      post_view_all: 'Переглянути все', post_back: '← До стрічки', post_not_found: 'Публікацію не знайдено.',
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
      videos_all: '🎬 Всі відео', videos_back: '← Про нас',
      contact_tag: "Зв'язок", contact_title: 'Зв\'яжіться з <span>Нами</span>',
      contact_desc: 'Запрошуємо на виступи, богослужіння та спільну молитву. Пишіть нам — відповімо з радістю!',
      contact_hint: 'Оберіть, з ким зв\'язатись:',
      contact_email: 'Email', contact_tg: 'Telegram', contact_yt: 'YouTube', contact_wa: 'WhatsApp', contact_ig: 'Instagram',
      contact_dev_name: 'Саша', contact_dev_role: 'Розробник сайту',
      contact_dev_text: 'Привіт, мене звати Саша, я розробник цього веб сайту. Всі питання з приводу створення, дизайну, редизайну і програмування — пишіть мені в Telegram або в WhatsApp.',
      contact_admin_name: 'Валентина', contact_admin_role: 'Адміністратор',
      contact_admin_text: 'Привіт. Мене звати Валентина. Ви можете зв\'язатися зі мною з усіх організаційних питань за номером телефону або написавши мені в один із наявних месенджерів.',
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
      auth_or: 'or', auth_forgot: 'Forgot password?',
      auth_reset_sent: 'If that account exists, we have sent a password reset email.',
      auth_verify_title: 'Confirm your email',
      auth_verify_text: 'We sent an email to {email}. Open it and click the link, then come back here.',
      auth_verify_done: "I've confirmed", auth_verify_resend: 'Send the email again', auth_verify_resent: 'Email sent again.',
      auth_err_bad_login: 'Invalid email or password', auth_err_email_taken: 'This email is already registered',
      auth_err_bad_email: 'Invalid email', auth_err_weak_password: 'Password must be at least 6 characters',
      auth_err_bad_name: 'Name must be 2 to 40 characters', auth_err_too_many: 'Too many attempts. Try again in a few minutes.',
      auth_err_network: 'No connection. Check your internet and try again.',
      auth_err_popup_blocked: 'Your browser blocked the sign-in window. Allow pop-ups for this site.',
      auth_err_other_provider: 'This email is already used with another sign-in method. Sign in that way.',
      auth_err_not_enabled: 'This sign-in method is unavailable right now.', auth_err_not_verified: 'Email not confirmed yet. Check the message, including your spam folder.',
      auth_err_unknown: 'Something went wrong. Please try again.',
      comment_verify: 'To comment — <a>confirm your email</a>',
      comment_error: 'Could not save. Please try again.',
      footer: '© 2026 <strong>Children of God</strong> — Music Group. Glory to God for every song. ✝',
      feed_tag: 'Feed', feed_title: 'Latest <span>News</span>',
      feed_empty: 'No posts yet. Something is coming soon! 🙏',
      feed_locked_title: '<span>News</span> Feed',
      feed_locked_desc: "The news feed is being prepared and will open soon. Stay tuned! 🙏",
      post_view_all: 'View all', post_back: '← Back to feed', post_not_found: 'Post not found.',
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
      videos_all: '🎬 All videos', videos_back: '← About us',
      contact_tag: 'Contact', contact_title: 'Get in <span>Touch</span>',
      contact_desc: 'We welcome invitations to performances, services, and prayer gatherings. Write to us — we\'ll respond with joy!',
      contact_hint: 'Choose who to contact:',
      contact_email: 'Email', contact_tg: 'Telegram', contact_yt: 'YouTube', contact_wa: 'WhatsApp', contact_ig: 'Instagram',
      contact_dev_name: 'Alex', contact_dev_role: 'Website Developer',
      contact_dev_text: "Hi, my name is Alex, I'm the developer of this website. For any questions about building, design, redesign, or programming — message me on Telegram or WhatsApp.",
      contact_admin_name: 'Valentyna', contact_admin_role: 'Administrator',
      contact_admin_text: 'Hi. My name is Valentyna. You can reach me about any organizational questions by phone, or by writing to me on one of the messengers below.',
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
      auth_or: 'или', auth_forgot: 'Забыли пароль?',
      auth_reset_sent: 'Если такой аккаунт существует, мы отправили письмо для восстановления пароля.',
      auth_verify_title: 'Подтвердите почту',
      auth_verify_text: 'Мы отправили письмо на {email}. Откройте его и нажмите ссылку, а затем вернитесь сюда.',
      auth_verify_done: 'Я подтвердил', auth_verify_resend: 'Отправить письмо ещё раз', auth_verify_resent: 'Письмо отправлено ещё раз.',
      auth_err_bad_login: 'Неверный email или пароль', auth_err_email_taken: 'Этот email уже зарегистрирован',
      auth_err_bad_email: 'Неверный email', auth_err_weak_password: 'Пароль — не менее 6 символов',
      auth_err_bad_name: 'Имя — от 2 до 40 символов', auth_err_too_many: 'Слишком много попыток. Попробуйте через несколько минут.',
      auth_err_network: 'Нет связи. Проверьте интернет и попробуйте ещё раз.',
      auth_err_popup_blocked: 'Браузер заблокировал окно входа. Разрешите всплывающие окна для этого сайта.',
      auth_err_other_provider: 'Этот email уже используется с другим способом входа. Войдите тем способом.',
      auth_err_not_enabled: 'Этот способ входа сейчас недоступен.', auth_err_not_verified: 'Почта ещё не подтверждена. Проверьте письмо, в том числе папку «Спам».',
      auth_err_unknown: 'Что-то пошло не так. Попробуйте ещё раз.',
      comment_verify: 'Чтобы комментировать — <a>подтвердите почту</a>',
      comment_error: 'Не удалось сохранить. Попробуйте ещё раз.',
      footer: '© 2026 <strong>Дети Божьи</strong> — Музыкальная группа. Слава Богу за каждую песню. ✝',
      feed_tag: 'Лента', feed_title: 'Актуальные <span>Новости</span>',
      feed_empty: 'Публикаций пока нет. Скоро что-то появится! 🙏',
      feed_locked_title: 'Раздел <span>Новости</span>',
      feed_locked_desc: 'Лента новостей сейчас готовится и скоро откроется. Следите за обновлениями! 🙏',
      post_view_all: 'Смотреть все', post_back: '← К ленте', post_not_found: 'Публикация не найдена.',
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
      videos_all: '🎬 Все видео', videos_back: '← О нас',
      contact_tag: 'Контакты', contact_title: 'Свяжитесь с <span>Нами</span>',
      contact_desc: 'Приглашаем на выступления, богослужения и совместную молитву. Пишите нам — ответим с радостью!',
      contact_hint: 'Выберите, с кем связаться:',
      contact_email: 'Email', contact_tg: 'Telegram', contact_yt: 'YouTube', contact_wa: 'WhatsApp', contact_ig: 'Instagram',
      contact_dev_name: 'Саша', contact_dev_role: 'Разработчик сайта',
      contact_dev_text: 'Привет, меня зовут Саша, я разработчик этого сайта. По всем вопросам создания, дизайна, редизайна и программирования — пишите мне в Telegram или в WhatsApp.',
      contact_admin_name: 'Валентина', contact_admin_role: 'Администратор',
      contact_admin_text: 'Привет. Меня зовут Валентина. Вы можете связаться со мной по всем организационным вопросам по номеру телефона или написав мне в один из доступных мессенджеров.',
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
     Медіа поста — файл із media/, data:-URL або зовнішнє посилання (зокрема YouTube)
  ───────────────────────────── */
  window.mediaInfo = function (src) {
    src = String(src || '').trim();
    if (!src) return null;
    const yt = src.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (yt) return { kind: 'youtube', id: yt[1], src: 'https://www.youtube.com/embed/' + yt[1] + '?rel=0', thumb: 'https://img.youtube.com/vi/' + yt[1] + '/hqdefault.jpg' };
    if (src.startsWith('data:video') || /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(src)) return { kind: 'video', src };
    return { kind: 'image', src };
  };
  // Усі медіа поста: новий формат — масив media, старий — одне поле image
  window.postMedia = function (p) {
    if (!p) return [];
    return (Array.isArray(p.media) && p.media.length ? p.media : [p.image]).filter(Boolean);
  };
  // Медіа для картки у стрічці — обрані в адмінці (до 4), інакше перші
  window.postPreview = function (p) {
    const all    = window.postMedia(p);
    const picked = Array.isArray(p && p.preview) ? p.preview.filter(s => all.includes(s)) : [];
    return (picked.length ? picked : all).slice(0, 4);
  };
  // Спільні пости з posts.json; локальний кеш — лише якщо файл недоступний
  window.loadPosts = function () {
    return fetch('posts.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => JSON.parse(localStorage.getItem('ditibozhi_posts') || '[]'))
      .then(p => Array.isArray(p) ? p : [], () => []);
  };
  // Фото галереї: спершу фото з постів (новіші пости першими), далі архів із img/
  window.loadGallery = function () {
    const archive = fetch('img/gallery.json')
      .then(r => r.ok ? r.json() : [])
      .then(l => Array.isArray(l) ? l.map(f => 'img/' + f) : [], () => []);
    return Promise.all([window.loadPosts(), archive]).then(([posts, old]) => {
      const fresh = posts.flatMap(window.postMedia).filter(s => (window.mediaInfo(s) || {}).kind === 'image');
      return [...new Set([...fresh, ...old])];
    });
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
    const { lang, t, applyLang, user, setShowAuth } = useContext(Ctx);

    function doLogout() { Auth.logout().catch(() => {}); }

    return html`
      <nav>
        <a class="nav-logo-img" href=${'#' + HOME_PAGE} onClick=${e => { e.preventDefault(); navigate(HOME_PAGE); }}>
          <img src=${lang === 'uk' ? 'logo.png' : lang === 'ru' ? 'logo(2).png' : 'logo(1).png'} alt=${t.nav_logo} class="nav-logo-png" onError=${e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }}/>
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
    const { t, user, setShowAuth } = useContext(Ctx);
    const [tab, setTab]   = useState('login');
    const [err, setErr]   = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const loginEmail = useRef(); const loginPass = useRef();
    const regName = useRef(); const regEmail = useRef(); const regPass = useRef();

    // увійшов із паролем, але ще не натиснув посилання з листа
    const verifying = user && !user.verified;

    function close() { setShowAuth(false); }
    function switchTab(next) { setTab(next); setErr(''); setNote(''); }

    // Усі дії йдуть однаково: кнопки блокуються, помилка показується мовою сайту
    async function run(fn) {
      if (busy) return;
      setBusy(true); setErr(''); setNote('');
      try { await fn(); }
      catch (e) { if (e.message !== 'cancelled') setErr(t['auth_err_' + e.message] || t.auth_err_unknown); }
      setBusy(false);
    }

    const doLogin    = () => run(async () => { if ((await Auth.login(loginEmail.current.value, loginPass.current.value)).verified) close(); });
    const doRegister = () => run(() => Auth.register(regName.current.value, regEmail.current.value, regPass.current.value));
    const doProvider = name => run(async () => { await Auth.loginWith(name); close(); });
    const doReset    = () => run(async () => { await Auth.resetPassword(loginEmail.current.value); setNote(t.auth_reset_sent); });
    const doResend   = () => run(async () => { await Auth.resendVerification(); setNote(t.auth_verify_resent); });
    const doCheck    = () => run(async () => {
      const u = await Auth.refresh();
      if (u && u.verified) close(); else setErr(t.auth_err_not_verified);
    });

    // close on backdrop click
    function onBackdrop(e) { if (e.target === e.currentTarget) close(); }
    // close on Escape
    useEffect(() => {
      const fn = e => e.key === 'Escape' && close();
      document.addEventListener('keydown', fn);
      return () => document.removeEventListener('keydown', fn);
    }, []);

    const providers = html`
      <div class="auth-or">${t.auth_or}</div>
      <div class="auth-providers">
        <button class="auth-provider" onClick=${() => doProvider('google')} disabled=${busy}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Google
        </button>
        <button class="auth-provider" onClick=${() => doProvider('github')} disabled=${busy}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#181717" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/>
          </svg>
          GitHub
        </button>
      </div>`;

    return html`
      <div class="auth-overlay" onClick=${onBackdrop}>
        <div class="auth-box">
          <button class="auth-close" onClick=${close}>✕</button>
          ${verifying ? html`
            <div class="auth-body">
              <h3 class="auth-heading">${t.auth_verify_title}</h3>
              <p class="auth-text">${t.auth_verify_text.replace('{email}', user.email)}</p>
              ${err && html`<div class="auth-error">${err}</div>`}
              ${note && html`<div class="auth-note">${note}</div>`}
              <button class="auth-submit" onClick=${doCheck} disabled=${busy}>${t.auth_verify_done}</button>
              <button class="auth-link" onClick=${doResend} disabled=${busy}>${t.auth_verify_resend}</button>
            </div>
          ` : html`
            <div class="auth-tabs">
              <button class=${'auth-tab' + (tab==='login' ? ' active':'')} onClick=${() => switchTab('login')}>
                ${t.auth_tab_login}
              </button>
              <button class=${'auth-tab' + (tab==='register' ? ' active':'')} onClick=${() => switchTab('register')}>
                ${t.auth_tab_register}
              </button>
            </div>
            <div class="auth-body">
              ${err && html`<div class="auth-error">${err}</div>`}
              ${note && html`<div class="auth-note">${note}</div>`}
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
                <button class="auth-submit" onClick=${doLogin} disabled=${busy}>${t.auth_tab_login}</button>
                <button class="auth-link" onClick=${doReset} disabled=${busy}>${t.auth_forgot}</button>
              ` : html`
                <div class="auth-field">
                  <label>${t.auth_name}</label>
                  <input type="text" ref=${regName} autocomplete="username" maxlength="40"/>
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
                <button class="auth-submit" onClick=${doRegister} disabled=${busy}>${t.auth_tab_register}</button>
              `}
              ${providers}
            </div>
          `}
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
  const failedPages = {};
  // сторінки, що живуть у чужому файлі: #post/<id> оголошено в pages/feed.js, #videos — у pages/about.js
  const PAGE_FILES  = { post: 'feed', videos: 'about' };

  function PageLoader({ page, param }) {
    const [Comp, setComp] = useState(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      let alive = true;
      const file = PAGE_FILES[page] || page;

      // Always reset to spinner on page change
      setComp(null);

      function done() {
        if (!alive) return;
        const C = window.Pages && window.Pages[page];
        setComp(() => C || (failedPages[file] ? LoadFailed : NotFound));
      }

      // Already loaded?
      if (window.Pages && window.Pages[page]) { done(); return () => { alive = false; }; }

      // Script in flight or needs loading
      const existing = loadedPages[file];
      const p = existing || new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'pages/' + file + '.js';
        s.onload  = () => resolve();
        // невдалу спробу не кешуємо — інакше сторінка лишалась би «404» до перезавантаження
        s.onerror = () => { delete loadedPages[file]; failedPages[file] = true; s.remove(); resolve(); };
        delete failedPages[file];
        document.body.appendChild(s);
      });
      if (!existing) loadedPages[file] = p;
      p.then(done);

      return () => { alive = false; };
    }, [page, attempt]);

    if (!Comp) return html`<div class="page-loader">⏳</div>`;
    return html`<${ErrorBoundary} key=${page}><${Comp} param=${param} onRetry=${() => setAttempt(a => a + 1)}/><//>`;
  }

  // Скрипт сторінки не завантажився: або її не існує, або зник зв'язок
  function LoadFailed({ onRetry }) {
    return html`
      <div class="page-loader">
        <p>⚠️ Не вдалося завантажити сторінку. Перевірте адресу або з'єднання.</p>
        <button class="gallery-view-btn" style=${{ marginTop: '1.2rem' }} onClick=${onRetry}>↻ Спробувати ще раз</button>
      </div>`;
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
    const [user, setUser] = useState(Auth.user);
    const [showAuth, setShowAuth] = useState(false);

    const t = I18N[lang] || I18N.en;
    // '#post/123' → сторінка 'post' з параметром '123'
    const [name, ...rest] = page.split('/');
    const param = rest.join('/');
    const inFeed = name === 'feed' || name === 'post';
    const inAbout = name === 'gallery' || name === 'videos';

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

    // акаунт живе у Firebase: стежимо за входом і виходом, зокрема в інших вкладках
    useEffect(() => Auth.onChange(setUser), []);
    useEffect(() => { Auth.setLang(lang); }, [lang]);

    // людина підтвердила пошту в іншій вкладці й повернулась — перечитуємо акаунт
    useEffect(() => {
      if (!user || user.verified) return;
      const fn = () => { if (!document.hidden) Auth.refresh().catch(() => {}); };
      document.addEventListener('visibilitychange', fn);
      return () => document.removeEventListener('visibilitychange', fn);
    }, [user && user.id, user && user.verified]);

    // expose openAuthModal globally (used in page components)
    useEffect(() => { window.openAuthModal = () => setShowAuth(true); }, []);

    const ctx = { lang, t, applyLang, user, showAuth, setShowAuth, navigate };

    return html`
      <${Ctx.Provider} value=${ctx}>
        <${Nav} page=${inFeed ? 'feed' : inAbout ? 'about' : name} navigate=${navigate}/>
        <main>
          ${FEED_LOCKED && inFeed ? html`<${FeedLocked}/>` : html`<${PageLoader} page=${name} param=${param}/>`}
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
