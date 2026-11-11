(() => {
  const modal = document.querySelector('[data-audit-modal]');
  if (!modal) return;
  const dialog = modal.querySelector('[data-audit-dialog]');
  const closeButton = modal.querySelector('[data-audit-close]');
  const loading = modal.querySelector('[data-audit-loading]');
  const results = modal.querySelector('[data-audit-results]');
  const errorBox = modal.querySelector('[data-audit-modal-error]');
  const title = modal.querySelector('[data-audit-title]');
  const domain = modal.querySelector('[data-audit-domain]');
  const summary = modal.querySelector('[data-audit-summary]');
  const pagesReviewed = modal.querySelector('[data-audit-pages-reviewed]');
  const reviewedPages = modal.querySelector('[data-audit-pages]');
  const overall = modal.querySelector('[data-audit-overall]');
  const categoryStrip = modal.querySelector('[data-audit-category-strip]');
  const details = modal.querySelector('[data-audit-details]');
  const emailForm = modal.querySelector('[data-audit-email-form]');
  const emailStatus = modal.querySelector('[data-audit-email-status]');
  const emailUnavailable = modal.querySelector('[data-audit-email-disabled]');
  const emailSent = modal.querySelector('[data-audit-email-sent]');
  const requiredNodes = [dialog, closeButton, loading, results, errorBox, title, domain, summary, overall, categoryStrip, details, emailForm, emailStatus];
  if (requiredNodes.some((node) => !node)) return;
  let previousFocus;
  let activeAuditToken = '';
  let fallbackSessionId = '';

  const createSessionId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.random() * 16 | 0;
      return (character === 'x' ? random : (random & 3 | 8)).toString(16);
    });
  };

  function auditSessionId() {
    try {
      let id = sessionStorage.getItem('audit-session');
      if (!id) {
        id = createSessionId();
        sessionStorage.setItem('audit-session', id);
      }
      return id;
    } catch {
      fallbackSessionId ||= createSessionId();
      return fallbackSessionId;
    }
  }

  const auditHeaders = () => ({ 'Content-Type': 'application/json', 'X-Zanove-Session': auditSessionId() });

  const openModal = () => {
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('audit-open');
    closeButton.focus();
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('audit-open');
    previousFocus?.focus();
  };
  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.classList.contains('audit-backdrop')) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const statusClass = (status) => status === 'Looking good' || status === 'Good'
    ? 'is-good' : status === 'Priority to improve' || status === 'Needs attention' ? 'is-priority' : 'is-work';
  const badge = (status) => make('span', `audit-badge ${statusClass(status)}`, status);

  function renderReport(payload) {
    const report = payload.report;
    activeAuditToken = payload.auditToken;
    title.textContent = 'Your Website Growth Audit';
    domain.textContent = payload.host;
    const method = payload.analysisMethod === 'ai-assisted' ? 'AI-assisted review' : 'measured page checks';
    if (pagesReviewed) pagesReviewed.textContent = `${payload.pagesReviewed} public page${payload.pagesReviewed === 1 ? '' : 's'} reviewed · ${method}`;
    if (reviewedPages) reviewedPages.replaceChildren();
    (payload.pages || []).forEach((page) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = page.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = page.title ? `${page.title} — ${new URL(page.url).pathname || '/'}` : page.url;
      item.append(link);
      reviewedPages?.append(item);
    });
    summary.textContent = report.summary;
    const signalBox = modal.querySelector('[data-audit-signals]');
    if (signalBox && payload.signals) {
      const signals = payload.signals;
      const items = [
        [`${signals.pagesFetched} / ${signals.pageLimit}`, 'public pages fetched'],
        [signals.responseCodes.join(', '), 'HTTP response codes'],
        [signals.totalImages, 'images found'],
        [signals.imagesMissingAlt, 'images missing alt text'],
        [signals.internalLinksFound, 'internal links found'],
        [signals.formsFound, 'forms found'],
        [signals.formFieldsWithoutLabels, 'form fields without labels'],
        [`${signals.averageResponseMs} ms`, 'average page response'],
        [`${signals.htmlKilobytesRead} KB`, 'HTML inspected'],
      ];
      signalBox.replaceChildren(...items.map(([value, label]) => {
        const item = document.createElement('div');
        item.className = 'audit-signal';
        const strong = document.createElement('strong');
        strong.textContent = value;
        const caption = document.createElement('span');
        caption.textContent = label;
        item.append(strong, caption);
        return item;
      }));
      signalBox.hidden = false;
    }
    overall.replaceChildren(make('span', `audit-overall-dot ${statusClass(report.overall_status)}`), make('strong', '', report.overall_status));
    categoryStrip.replaceChildren();
    details.replaceChildren();

    report.categories.forEach((category, index) => {
      const tile = make('div', 'audit-category-tile');
      tile.append(make('span', 'number', `0${index + 1}`), make('strong', '', category.title), badge(category.status));
      categoryStrip.append(tile);

      const section = make('section', 'audit-result-section');
      const heading = make('div', 'audit-result-heading');
      heading.append(make('span', 'number', `${index + 1}`), make('h2', '', category.title), badge(category.status));
      section.append(heading, make('p', 'audit-overview', category.overview));
      const list = make('ul', 'audit-finding-list');
      category.findings.forEach((finding) => {
        const item = make('li', `audit-finding ${statusClass(finding.status)}`);
        const marker = make('span', 'audit-finding-mark', finding.status === 'Good' ? '✓' : '•');
        const copy = make('div', '');
        copy.append(make('div', 'audit-finding-title', finding.title), make('p', '', finding.detail));
        const action = make('p', 'audit-action');
        action.append(make('strong', '', 'What to do: '), document.createTextNode(finding.action));
        copy.append(action);
        item.append(marker, copy);
        list.append(item);
      });
      section.append(list);
      details.append(section);
    });
    const booking = make('section', 'audit-booking-cta');
    const bookingCopy = make('div');
    const focusCategory = report.categories.find((category) => category.status === 'Priority to improve')
      || report.categories.find((category) => category.status === 'Needs some work');
    const bookingMessage = focusCategory
      ? `This review found an opportunity in ${focusCategory.title.toLowerCase()}. Request a consultation and we’ll help you plan a practical fix.`
      : 'Your website has a solid starting point. Request a consultation and we’ll help you decide what to improve next.';
    bookingCopy.append(
      make('p', 'eyebrow', 'Your next step'),
      make('h3', '', 'Let’s solve the problem this audit found.'),
      make('p', '', bookingMessage)
    );
    const bookingLink = make('button', 'button', 'Request a consultation ↗');
    bookingLink.type = 'button';
    bookingLink.setAttribute('data-open-project-inquiry', '');
    bookingLink.dataset.auditHost = payload.host;
    bookingLink.dataset.auditMessage = bookingMessage;
    bookingLink.setAttribute('aria-label', 'Request a project consultation');
    booking.append(bookingCopy, bookingLink);
    details.append(booking);
    modal.querySelectorAll('[data-open-project-inquiry]').forEach((button) => {
      button.dataset.auditHost = payload.host;
      button.dataset.auditMessage = bookingMessage;
    });
    loading.hidden = true;
    errorBox.hidden = true;
    const canEmail = payload.emailDeliveryConfigured !== false;
    emailForm.hidden = !canEmail;
    if (emailSent) emailSent.hidden = true;
    if (emailUnavailable) {
      emailUnavailable.hidden = canEmail;
      emailUnavailable.textContent = canEmail ? '' : 'Your full report is ready below. Email delivery is not configured on this deployment yet.';
    }
    emailStatus.textContent = '';
    details.hidden = canEmail;
    if (!canEmail) details.hidden = false;
    results.hidden = false;
  }


  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = emailForm.elements.name.value.trim();
    const email = emailForm.elements.email.value.trim();
    const consent = emailForm.elements.consent.checked;
    const submit = emailForm.querySelector('button[type="submit"]');
    emailStatus.textContent = '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailStatus.textContent = 'Enter a valid email address to receive your report.';
      emailForm.elements.email.focus();
      return;
    }
    if (!consent) {
      emailStatus.textContent = 'Please agree to the report delivery and Zanove follow-up.';
      emailForm.elements.consent.focus();
      return;
    }
    window.zanoveTrack?.('full_audit_report_requested');
    submit.disabled = true;
    submit.textContent = 'Sending your report…';
    try {
      const response = await fetch('/api/audit/email', {
        method: 'POST',
        headers: auditHeaders(),
        body: JSON.stringify({ auditToken: activeAuditToken, name, email, consent }),
      });
      const outcome = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(outcome.error || 'We could not send the report right now.');
      window.zanoveTrack?.('full_audit_report_sent');
      if (emailSent) {
        emailSent.textContent = 'Your full report is on its way, and Zanove has received your request. If it is not in your inbox in a few minutes, check your Spam or Promotions folder.';
        emailSent.hidden = false;
      }
      emailForm.hidden = true;
      details.hidden = false;
    } catch (sendError) {
      emailStatus.textContent = sendError.message || 'Email delivery is temporarily unavailable. Your report is ready to read below.';
      details.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Email my full report';
    }
  });

  document.querySelectorAll('[data-zanove-audit-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = form.querySelector('input[name="website"]');
      const button = form.querySelector('button[type="submit"]');
      const error = form.querySelector('[data-audit-error]');
      error.textContent = '';
      if (window.location.protocol === 'file:') {
        error.textContent = 'The audit needs the Next.js server. Run npm run dev, then open http://127.0.0.1:3001.';
        return;
      }
      let url;
      try {
        const value = input.value.trim();
        url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error();
      } catch {
        error.textContent = 'Enter a valid website address, such as yourwebsite.com.';
        input.focus();
        return;
      }
      button.disabled = true;
      button.textContent = 'Reviewing your website…';
      window.zanoveTrack?.('website_audit_started');
      loading.hidden = false;
      results.hidden = true;
      emailForm.hidden = false;
      if (emailSent) emailSent.hidden = true;
      if (emailUnavailable) emailUnavailable.hidden = true;
      errorBox.hidden = true;
      title.textContent = 'Your Website Growth Audit';
      domain.textContent = url.hostname;
      const loadingText = loading.querySelector('[data-audit-loading-text]');
      if (loadingText) loadingText.textContent = `Reviewing public pages on ${url.hostname}. This usually takes under 45 seconds.`;
      openModal();
      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          headers: auditHeaders(),
          body: JSON.stringify({ url: url.href }),
        });
        const responseText = await response.text();
        let payload = {};
        try { payload = responseText ? JSON.parse(responseText) : {}; } catch { /* The host may return an HTML timeout/error page. */ }
        if (!response.ok) {
          const message = payload.error || (response.status === 504
            ? 'The website took too long to respond. Try again in a moment or audit its homepage URL.'
            : response.status >= 500
              ? `The audit service is temporarily unavailable (HTTP ${response.status}). Please try again shortly.`
              : `The audit could not run (HTTP ${response.status}). ${response.status === 429 ? 'Please try again later.' : 'Check the website address and try again.'}`);
          throw new Error(message);
        }
        if (!payload.report || !Array.isArray(payload.report.categories)) {
          throw new Error('The audit service returned an incomplete report. Please try again shortly.');
        }
        renderReport(payload);
        window.zanoveTrack?.('website_audit_completed');
      } catch (requestError) {
        window.zanoveTrack?.('website_audit_failed');
        loading.hidden = true;
        errorBox.textContent = requestError.message || 'We could not complete the audit right now.';
        errorBox.hidden = false;
      } finally {
        button.disabled = false;
        button.innerHTML = 'Run website check <span aria-hidden="true">↗</span>';
      }
    });
  });
})();
