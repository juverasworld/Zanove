(() => {
  const forms = [...document.querySelectorAll('[data-project-form]')];
  if (!forms.length) return;
  const modal = document.querySelector('[data-project-inquiry-modal]');
  const dialog = modal?.querySelector('.project-inquiry-dialog');
  let previousFocus = null;
  let modalContext = null;

  const sessionId = () => {
    try {
      let id = sessionStorage.getItem('zanove-project-session');
      if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('zanove-project-session', id); }
      return id;
    } catch { return crypto.randomUUID?.() || ''; }
  };

  const openModal = (detail = {}) => {
    if (!modal || !dialog) return;
    modalContext = detail;
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('project-inquiry-open');
    const form = modal.querySelector('[data-project-form]');
    if (detail.service && form?.elements.service) form.elements.service.value = detail.service;
    if (detail.message && form?.elements.message) form.elements.message.value = detail.message;
    requestAnimationFrame(() => modal.querySelector('.project-inquiry-close')?.focus());
  };
  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('project-inquiry-open');
    previousFocus?.focus();
  };

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-project-inquiry]');
    if (opener) {
      event.preventDefault();
      const detail = opener.dataset.auditHost ? {
        service: 'Not sure yet',
        message: `I’d like help acting on the findings from my website audit for ${opener.dataset.auditHost}.\n\n${opener.dataset.auditMessage || ''}`,
      } : {};
      openModal(detail);
    }
    if (event.target.closest('[data-project-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (!modal || modal.hidden) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
        .filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });

  forms.forEach((form) => {
    const status = form.querySelector('[data-project-status]');
    const button = form.querySelector('[data-project-submit]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!status || !button) return;
      status.textContent = '';
      status.classList.remove('is-success');
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      data.consent = form.elements.consent.checked;
      button.disabled = true;
      button.textContent = 'Sending your request…';
      try {
        const response = await fetch('/api/project-inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Zanove-Session': sessionId() },
          body: JSON.stringify(data),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'We could not send your request. Please try again or contact Zanove on WhatsApp.');
        form.reset();
        status.classList.add('is-success');
        status.textContent = 'Thanks — your consultation request has been sent to Zanove. We’ll reply using the contact details you provided.';
        window.zanoveTrack?.('consultation_request_sent');
        modalContext = null;
      } catch (error) {
        status.textContent = error.message || 'We could not send your request. Please try WhatsApp or email Zanove.';
      } finally {
        button.disabled = false;
        button.innerHTML = 'Request a consultation <span aria-hidden="true">↗</span>';
      }
    });
  });
})();
