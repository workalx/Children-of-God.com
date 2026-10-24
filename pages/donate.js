/* pages/donate.js */
(function () {
  const { useState, useRef, useEffect } = React;
  const html = window.html;
  const Ctx  = window.useApp;

  // Посилання з акаунтів Stripe і PayPal. Поки порожнє — кнопка показує «незабаром»
  // (Stripe) або email для переказу (PayPal).
  const STRIPE_URL = 'https://buy.stripe.com/6oU8wQ7uc2wC6dD9zeenS00';  // https://buy.stripe.com/…
  const PAYPAL_URL = '';  // https://www.paypal.com/donate/?hosted_button_id=…
  const DONATE_EMAIL = 'alexhalus201006@gmail.com';

  const CARD_BRANDS = ['VISA', 'Mastercard', 'AMEX', 'Apple Pay', 'Google Pay'];

  function CopyEmail({ t }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef();
    useEffect(() => () => clearTimeout(timer.current), []);

    function copy() {
      const done = () => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      };
      // вбудовані браузери (Instagram, Telegram) часто не дають доступу до clipboard API
      const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = DONATE_EMAIL;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { if (document.execCommand('copy')) done(); } catch {}
        ta.remove();
      };
      if (navigator.clipboard) navigator.clipboard.writeText(DONATE_EMAIL).then(done, fallback);
      else fallback();
    }

    return html`
      <div class="donate-email">
        <span class="donate-email-addr">${DONATE_EMAIL.split('@')[0]}@<wbr/>${DONATE_EMAIL.split('@')[1]}</span>
        <button class=${'donate-copy' + (copied ? ' copied' : '')} onClick=${copy}>
          ${copied ? t.donate_copied : t.donate_copy}
        </button>
      </div>`;
  }

  function Thanks({ t, navigate }) {
    return html`
      <div class="page-section donate-section">
        <div class="section-inner">
          <div class="donate-wrap donate-thanks">
            <div class="donate-thanks-icon">🙏</div>
            <h1 class="section-title" dangerouslySetInnerHTML=${{ __html: t.donate_thanks_title }}></h1>
            <div class="section-line" style=${{ marginLeft: 'auto', marginRight: 'auto' }}></div>
            <p class="donate-desc">${t.modal_thanks}</p>
            <button class="donate-btn" onClick=${() => navigate('feed')}>${t.donate_thanks_back}</button>
          </div>
        </div>
      </div>`;
  }

  function DonatePage({ param }) {
    const { t, navigate } = Ctx();

    // Stripe повертає сюди після оплати: #donate/thanks
    if (param === 'thanks') return html`<${Thanks} t=${t} navigate=${navigate}/>`;

    return html`
      <div class="page-section donate-section">
        <div class="section-inner">
          <div class="donate-wrap">
            <span class="section-tag">${t.donate_tag}</span>
            <h1 class="section-title" dangerouslySetInnerHTML=${{ __html: t.donate_title }}></h1>
            <div class="section-line" style=${{ marginLeft: 'auto', marginRight: 'auto' }}></div>
            <p class="donate-desc">${t.donate_desc}</p>

            <div class="donate-main">
              <div class="donate-main-icon">💳</div>
              <h2 class="donate-main-title">${t.donate_card_title}</h2>
              <p class="donate-main-text">${t.donate_card_text}</p>
              <div class="donate-brands">
                ${CARD_BRANDS.map(b => html`<span class="donate-brand" key=${b}>${b}</span>`)}
              </div>
              ${STRIPE_URL
                ? html`<a class="donate-btn donate-btn--big" href=${STRIPE_URL}>${t.donate_card_btn}</a>`
                : html`
                  <button class="donate-btn donate-btn--big" disabled>${t.donate_card_btn}</button>
                  <p class="donate-soon">${t.donate_card_soon}</p>`}
              <p class="donate-main-note">🔒 ${t.donate_card_note}</p>
            </div>

            <div class="donate-other">
              <span class="donate-other-title">${t.donate_other}</span>
            </div>

            <div class="donate-ways">
              <div class="donate-way">
                <div class="donate-way-head">
                  <span class="donate-way-icon">🅿️</span>
                  <span class="donate-way-title">PayPal</span>
                </div>
                <p class="donate-way-text">${t.donate_paypal_text}</p>
                ${PAYPAL_URL
                  ? html`<a class="donate-way-btn" href=${PAYPAL_URL} target="_blank" rel="noopener">${t.donate_paypal_btn}</a>`
                  : html`<${CopyEmail} t=${t}/>`}
              </div>
              <div class="donate-way">
                <div class="donate-way-head">
                  <span class="donate-way-icon">🏦</span>
                  <span class="donate-way-title">${t.donate_interac_title}</span>
                </div>
                <p class="donate-way-text">${t.donate_interac_text}</p>
                <${CopyEmail} t=${t}/>
              </div>
            </div>

            <p class="donate-note">${t.donate_note}</p>
            <p class="donate-bless">${t.modal_thanks}</p>
          </div>
        </div>
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.donate = DonatePage;
})();
