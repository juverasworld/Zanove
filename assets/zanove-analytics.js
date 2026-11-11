(() => {
  const consentKey = 'zanove-analytics-choice';
  const scriptElement = document.currentScript;
  const gaId = scriptElement?.dataset.gaMeasurementId || '';
  const gtmId = scriptElement?.dataset.gtmContainerId || '';
  let analyticsLoaded = false;
  const sentDepths = new Set();
  const sentTime = new Set();
  const pagePath = () => location.pathname.slice(0, 160);

  const send = (name, properties = {}) => {
    if (!analyticsLoaded) return;
    if (typeof window.va === 'function') window.va('event', name, { page: pagePath(), ...properties });
    if (gaId && typeof window.gtag === 'function') window.gtag('event', name, { page_path: pagePath(), ...properties });
  };
  window.zanoveTrack = (name, properties) => {
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(name)) return;
    send(name, properties || {});
  };

  function loadAnalytics() {
    if (analyticsLoaded) return;
    window.va = window.va || function vercelAnalytics() { (window.vaq = window.vaq || []).push(arguments); };
    const webAnalytics = document.createElement('script');
    webAnalytics.defer = true;
    webAnalytics.src = '/_vercel/insights/script.js';
    document.head.append(webAnalytics);
    const speedInsights = document.createElement('script');
    speedInsights.defer = true;
    speedInsights.src = '/_vercel/speed-insights/script.js';
    document.head.append(speedInsights);
    if (/^G-[A-Z0-9]+$/i.test(gaId) || /^GTM-[A-Z0-9]+$/i.test(gtmId)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
      window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window.gtag('js', new Date());
      if (/^G-[A-Z0-9]+$/i.test(gaId)) {
        window.gtag('config', gaId, { send_page_view: true, allow_google_signals: false, allow_ad_personalization_signals: false });
        const googleAnalytics = document.createElement('script');
        googleAnalytics.async = true;
        googleAnalytics.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        document.head.append(googleAnalytics);
      }
      if (/^GTM-[A-Z0-9]+$/i.test(gtmId)) {
        window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
        const tagManager = document.createElement('script');
        tagManager.async = true;
        tagManager.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
        document.head.append(tagManager);
      }
    }
    analyticsLoaded = true;
  }

  let choice = '';
  try { choice = localStorage.getItem(consentKey) || ''; } catch { /* Keep analytics disabled if storage is unavailable. */ }
  if (choice === 'accepted') loadAnalytics();

  const banner = document.createElement('aside');
  banner.className = 'analytics-consent-banner';
  banner.setAttribute('aria-label', 'Analytics choices');
  banner.hidden = Boolean(choice);
  const privacyHref = location.pathname.startsWith('/blog/') ? '../privacy.html' : 'privacy.html';
  const googleCopy = gaId && gtmId ? 'Google Analytics and Tag Manager also load' : gaId ? 'Google Analytics also loads' : gtmId ? 'Google Tag Manager also loads' : '';
  banner.innerHTML = `<div><strong>Help us improve Zanove</strong><p>If you accept, Vercel Analytics and Speed Insights measure visits, site interactions and real-world performance${googleCopy ? `; ${googleCopy}` : ''}. We do not send form entries, audit addresses or AI chat text. <a href="${privacyHref}">Privacy &amp; analytics details</a>.</p></div><div class="analytics-consent-actions"><button type="button" data-analytics-reject>Reject analytics</button><button type="button" data-analytics-accept>Accept analytics</button></div>`;
  document.body.append(banner);
  const setChoice = (nextChoice) => {
    const wasLoaded = analyticsLoaded;
    try { localStorage.setItem(consentKey, nextChoice); } catch { /* Current-page choice still applies. */ }
    choice = nextChoice;
    banner.hidden = true;
    if (nextChoice === 'accepted') loadAnalytics();
    // Vercel injects page and performance listeners independently. Reloading
    // after revocation removes those listeners for the rest of this visit.
    else if (wasLoaded) window.location.reload();
    if (nextChoice === 'rejected' && gaId) {
      document.cookie.split(';').forEach((part) => {
        const name = part.split('=')[0].trim();
        if (/^_ga($|_)/.test(name)) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      });
    }
  };
  banner.querySelector('[data-analytics-accept]').addEventListener('click', () => setChoice('accepted'));
  banner.querySelector('[data-analytics-reject]').addEventListener('click', () => setChoice('rejected'));
  document.querySelectorAll('[data-analytics-settings]').forEach((button) => {
    button.addEventListener('click', (event) => { event.preventDefault(); banner.hidden = false; });
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('a,button') : null;
    if (!target) return;
    if (target.matches('[data-analytics-accept], [data-analytics-reject], [data-analytics-settings]')) return;
    if (target.closest('[data-project-form], [data-audit-email-form], [data-ask-form], [data-ask-handoff-form]')) return;
    if (target.matches('[data-zanove-event]')) {
      send(target.dataset.zanoveEvent, { placement: target.dataset.analyticsPlacement || 'page' });
      return;
    }
    if (target.matches('[data-ask-launcher]')) { send('ask_ai_opened'); return; }
    if (target.matches('[data-ask-prompt]')) { send('ask_ai_prompt_selected'); return; }
    if (target.matches('[data-open-project-inquiry]')) { send('consultation_form_opened', { source: 'audit' }); return; }
    if (target.matches('[data-menu-toggle]')) { send('navigation_menu_opened'); return; }
    if (target.matches('.work-filter')) { send('project_filter_selected', { filter: target.dataset.workFilter || 'unknown' }); return; }
    if (target.matches('a')) {
      const href = target.getAttribute('href') || '';
      const label = (target.getAttribute('aria-label') || target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (href.startsWith('mailto:')) send('email_link_clicked', { link_label: label });
      else if (/wa\.me|api\.whatsapp\.com/i.test(href)) send('whatsapp_link_clicked', { link_label: label });
      else if (target.hostname && target.hostname !== location.hostname) send('outbound_link_clicked', { destination: target.hostname, link_label: label });
      else if (href && !href.startsWith('#')) send('internal_link_clicked', { link_label: label });
    }
  });

  let activeSeconds = 0;
  let previousTick = Date.now();
  const milestones = [30, 60, 180, 300, 600];
  window.setInterval(() => {
    const now = Date.now();
    if (!document.hidden) activeSeconds += Math.min(2, Math.max(0, (now - previousTick) / 1000));
    previousTick = now;
    milestones.forEach((seconds) => {
      if (activeSeconds >= seconds && !sentTime.has(seconds)) {
        sentTime.add(seconds);
        send('engaged_time_milestone', { seconds });
      }
    });
  }, 1000);

  window.addEventListener('scroll', () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const progress = Math.floor((window.scrollY / maxScroll) * 100);
    [25, 50, 75, 90].forEach((depth) => {
      if (progress >= depth && !sentDepths.has(depth)) {
        sentDepths.add(depth);
        send('scroll_depth', { percent: depth });
      }
    });
  }, { passive: true });
})();
