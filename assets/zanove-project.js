(() => {
  const form = document.querySelector('[data-project-form]');
  if (!form) return;
  const status = form.querySelector('[data-project-status]');
  const button = form.querySelector('[data-project-submit]');
  const sessionId = () => {
    try {
      let id = sessionStorage.getItem('zanove-project-session');
      if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('zanove-project-session', id); }
      return id;
    } catch { return crypto.randomUUID?.() || ''; }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
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
      status.textContent = 'Thanks — your project enquiry has been sent to Zanove. We’ll reply using the contact details you provided.';
    } catch (error) {
      status.classList.remove('is-success');
      status.textContent = error.message || 'We could not send your request. Please try WhatsApp or email Zanove.';
    } finally {
      button.disabled = false;
      button.innerHTML = 'Request a consultation <span aria-hidden="true">↗</span>';
    }
  });
})();
