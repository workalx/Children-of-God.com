/* pages/donate.js */
(function () {
  const { useState, useContext } = React;
  const html = window.html;
  const Ctx  = window.useApp;

  function DonatePage() {
    const { t } = Ctx();
    const [showModal, setShowModal] = useState(false);

    return html`
      <div class="page-section donate-section">
        <div class="section-inner">
          <div class="donate-wrap">
            <span class="section-tag">${t.donate_tag}</span>
            <h1 class="section-title" dangerouslySetInnerHTML=${{ __html: t.donate_title }}></h1>
            <div class="section-line" style=${{ marginLeft: 'auto', marginRight: 'auto' }}></div>
            <p class="donate-desc">${t.donate_desc}</p>

            <div class="donate-cards">
              <div class="donate-card">
                <div class="donate-card-icon">💳</div>
                <div class="donate-card-title">${t.donate_card2_title}</div>
                <div class="donate-card-text">${t.donate_card2_text}</div>
              </div>
              <div class="donate-card">
                <div class="donate-card-icon">🏦</div>
                <div class="donate-card-title">${t.donate_card4_title}</div>
                <div class="donate-card-text">${t.donate_card4_text}</div>
              </div>
            </div>

            <button class="donate-btn" onClick=${() => setShowModal(true)}>
              ${t.donate_btn}
            </button>
          </div>
        </div>

        ${showModal && html`
          <div class="modal-overlay" onClick=${e => e.target === e.currentTarget && setShowModal(false)}>
            <div class="modal-box">
              <button class="modal-close" onClick=${() => setShowModal(false)}>✕</button>
              <div style=${{ fontSize: '2.5rem', marginBottom: '1rem' }}>🙏</div>
              <h3 style=${{ fontFamily: 'var(--serif)', color: 'var(--blue)', fontSize: '1.4rem', marginBottom: '.5rem' }}>
                ${t.modal_title}
              </h3>
              <p style=${{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: '1.2rem' }}>${t.modal_desc}</p>
              <div class="modal-email">📧 alexhalus201006@gmail.com</div>
              <p class="modal-thanks">${t.modal_thanks}</p>
            </div>
          </div>`}
      </div>`;
  }

  window.Pages = window.Pages || {};
  window.Pages.donate = DonatePage;
})();
