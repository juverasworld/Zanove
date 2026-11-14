import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import posts from '../content/blog-posts.json' with { type: 'json' };
import { services, servicePath } from '../lib/services.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const pages = ['index.html', 'service.html', 'about.html', 'projects.html', 'audit.html', 'blog.html', 'ebook.html', 'ask-ai.html', 'project.html', 'privacy.html'];
const sitePageLinks = [
  ['Home', '/'],
  ['Services', '/service.html'],
  ...services.map(({ name, slug }) => [name, servicePath(slug)]),
  ['About Zanove', '/about.html'],
  ['Projects', '/projects.html'],
  ['Website audit', '/audit.html'],
  ['Request a consultation', '/project.html'],
  ['Blog', '/blog'],
  ['Books', '/ebook.html'],
  ['Ask Zanove AI', '/ask-ai.html'],
  ['Privacy & analytics', '/privacy.html'],
];
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');
const configuredGaId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WYXN8GWNEY').trim();
const gaId = /^G-[A-Z0-9]+$/i.test(configuredGaId) ? configuredGaId : '';
const configuredGtmId = (process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || 'GTM-55VQNQWP').trim();
const gtmId = /^GTM-[A-Z0-9]+$/i.test(configuredGtmId) ? configuredGtmId : '';
const ahrefsKey = 'CVA7infvQMvCW2YUPGw1CA';
const googleVerification = 'Z1rbCX8T_WfYfE_uLcgIFZVqsTPcdF8znA0PuYP5aeY';
for (const page of pages) {
  const source = path.join(root, page);
  const $ = load(fs.readFileSync(source, 'utf8'));
  // Use the canonical homepage URL instead of the redirecting /index.html alias.
  $('a[href="index.html"], a[href="./index.html"], a[href="../index.html"]').attr('href', '/');
  $('a[href="blog.html"], a[href="/blog.html"], a[href="../blog.html"]').attr('href', '/blog');
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    const article = href.match(/^(?:\.\.\/|\.\/|\/)?blog\/([a-z0-9-]+)(?:\.html)?$/i);
    if (article) $(element).attr('href', `/blog/${article[1]}`);
  });
  $('link[rel="stylesheet"][href*="zanove-site.css"]').attr('href', 'assets/zanove-site.css?v=20261111-consultation');
  $('script[src*="zanove-ui.js"]').attr('src', 'assets/zanove-ui.js?v=20261111-home-audit');
  $('script[src*="zanove-audit.js"]').attr('src', 'assets/zanove-audit.js?v=20261111-home-audit');
  $('head script[src*="zanove-analytics.js"]').remove();
  $('head meta[name="google-site-verification"]').remove();
  $('head').append(`<meta name="google-site-verification" content="${googleVerification}">`);
  $('head').append(`<script src="assets/zanove-analytics.js?v=20261111-ahrefs" data-ga-measurement-id="${gaId}" data-gtm-container-id="${gtmId}" data-ahrefs-key="${ahrefsKey}" defer></script>`);
  if (['index.html', 'audit.html'].includes(page)) {
    $('head script[src*="zanove-project.js"]').remove();
    $('head').append('<script src="assets/zanove-project.js?v=20261111-modal2" defer></script>');
    if (!$('[data-project-inquiry-modal]').length) {
      $('body').append(fs.readFileSync(path.join(root, 'assets/project-inquiry-modal.html'), 'utf8'));
    }
  }
  if (page === 'index.html') {
    $('[data-journal-preview]').remove();
    const articleCards = posts.slice(0, 3).map(({ slug, title, category, description }) => `<article class="blog-card"><p class="project-kicker">${escapeHtml(category || 'Zanove Journal')}</p><h3><a href="/blog/${escapeHtml(slug)}">${escapeHtml(title)}</a></h3><p>${escapeHtml(description)}</p><a class="card-link" href="/blog/${escapeHtml(slug)}">Read the article <span aria-hidden="true">↗</span></a></article>`).join('');
    const journal = `<section class="section" data-journal-preview aria-labelledby="journal-preview-title"><div class="container"><div class="section-heading"><p class="eyebrow">From the Zanove Journal</p><h2 id="journal-preview-title">Useful ideas for your next digital decision.</h2><p>Practical perspectives on websites, software, AI and business workflows, written to help you choose a clearer next step.</p></div><div class="blog-card-grid">${articleCards}</div><p class="journal-more"><a class="card-link" href="/blog">Explore all journal articles ↗</a></p></div></section>`;
    if ($('#services').length) $('#services').after(journal);
    else $('main').append(journal);
  }
  if (page === 'service.html') {
    $('[data-service-journal]').remove();
    const articleCards = posts.slice(0, 3).map(({ slug, title, category, description }) => `<article class="blog-card"><p class="project-kicker">${escapeHtml(category || 'Zanove Journal')}</p><h3><a href="/blog/${escapeHtml(slug)}">${escapeHtml(title)}</a></h3><p>${escapeHtml(description)}</p><a class="card-link" href="/blog/${escapeHtml(slug)}">Read the article <span aria-hidden="true">↗</span></a></article>`).join('');
    const journal = `<section class="section related-journal" data-service-journal aria-labelledby="service-journal-title"><div class="container"><div class="section-heading"><p class="eyebrow">From the Zanove Journal</p><h2 id="service-journal-title">Explore the thinking behind the work.</h2><p>Practical reading on website design, automation and AI creative for Nigerian businesses.</p></div><div class="blog-card-grid">${articleCards}</div><p class="journal-more"><a class="card-link" href="/blog">Browse all articles ↗</a></p></div></section>`;
    const callToAction = $('main > section').filter((_, element) => $(element).find('.cta-band').length).first();
    if (callToAction.length) callToAction.before(journal);
    else $('main').append(journal);
  }
  $('[data-ask-launcher]').each((_, el) => {
    $(el).empty().append('<span class="ask-widget-launcher-mark" aria-hidden="true">Z</span><span>Ask Zanove AI</span>');
    $(el).attr('aria-label', 'Open Ask Zanove AI');
  });
  $('a.nav-cta').attr('href', 'project.html').html('Discuss a project <span aria-hidden="true">↗</span>');
  const allPagesNav = $('footer nav.footer-links').first();
  allPagesNav.attr('aria-label', 'All pages');
  allPagesNav.empty().append(sitePageLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join(''));
  $('footer .footer-title').first().text('All pages');
  if (!$('a[href="privacy.html"]').length) $('footer .footer-links').last().append('<a href="privacy.html">Privacy &amp; analytics</a>');
  if (!$('a[data-analytics-settings]').length) $('footer .footer-links').last().append('<a href="#analytics-settings" data-analytics-settings>Analytics preferences</a>');
  $('footer [data-social-links]').remove();
  $('footer .footer-main').append('<div data-social-links><h2 class="footer-title">Follow Zanove</h2><nav class="footer-links" aria-label="Zanove social links"><a href="https://x.com/ZanoveTech" target="_blank" rel="noopener noreferrer">X <span aria-hidden="true">↗</span></a><a href="https://www.instagram.com/zanovetech/" target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a><a href="https://www.linkedin.com/in/obasivera/" target="_blank" rel="noopener noreferrer">Obasi Vera · Founder on LinkedIn <span aria-hidden="true">↗</span></a></nav></div>');
  $('a[href="mailto:zanovetechnologies@gmail.com"]').filter((_, el) => /book a call/i.test($(el).text())).text('Email Zanove to arrange a call');
  const canonical = page === 'index.html' ? `${site}/` : page === 'blog.html' ? `${site}/blog` : `${site}/${page}`;
  $('head link[rel="canonical"]').attr('href', canonical);
  $('head meta[property="og:url"]').attr('content', canonical);
  const title = $('head title').text().trim();
  $('head meta[property=\"og:image\"], head meta[name=\"twitter:image\"]').attr('content', `${site}/assets/zanove-social.jpg`);
  $('head meta[property="og:title"], head meta[name="twitter:title"]').attr('content', title);
  const orgScript = $('head script[type="application/ld+json"][data-zanove-schema]');
  if (orgScript.length) {
    try {
      const schema = JSON.parse(orgScript.text());
      if (schema['@type'] === 'Organization') {
        schema['@id'] = `${site}/#organization`;
        schema.url = `${site}/`;
        schema.logo = `${site}/assets/zanove-logo.png`;
        schema.sameAs = ['https://x.com/ZanoveTech', 'https://www.instagram.com/zanovetech/'];
        orgScript.text(JSON.stringify(schema));
      }
    } catch { /* Leave invalid schema unchanged for easier source debugging. */ }
  }
  fs.writeFileSync(source, $.html());
  fs.copyFileSync(source, path.join(root, 'public', page));
}
const articleDir = path.join(root, 'public', 'blog');
if (fs.existsSync(articleDir)) {
  for (const name of fs.readdirSync(articleDir).filter((file) => file.endsWith('.html'))) {
    const filename = path.join(articleDir, name);
    const $ = load(fs.readFileSync(filename, 'utf8'));
    $('a[href="../index.html"], a[href="index.html"]').attr('href', '/');
    $('link[rel="stylesheet"][href*="zanove-site.css"]').attr('href', `${site}/assets/zanove-site.css?v=20261111-consultation`);
    $('script[src*="zanove-ui.js"]').attr('src', `${site}/assets/zanove-ui.js?v=20261111-home-audit`);
    $('script[src*="zanove-audit.js"]').attr('src', `${site}/assets/zanove-audit.js?v=20261111-home-audit`);
    $('head script[src*="zanove-analytics.js"]').remove();
    $('head meta[name="google-site-verification"]').remove();
    $('head').append(`<meta name="google-site-verification" content="${googleVerification}">`);
    $('head').append(`<script src="${site}/assets/zanove-analytics.js?v=20261111-ahrefs" data-ga-measurement-id="${gaId}" data-gtm-container-id="${gtmId}" data-ahrefs-key="${ahrefsKey}" defer></script>`);
    const allPagesNav = $('footer nav.footer-links').first();
    allPagesNav.attr('aria-label', 'All pages');
    allPagesNav.empty().append(sitePageLinks.map(([label, href]) => `<a href="${href}">${label}</a>`).join(''));
    $('footer .footer-title').first().text('All pages');
    if (!$('a[href="../privacy.html"]').length) $('footer .footer-links').last().append('<a href="../privacy.html">Privacy &amp; analytics</a>');
    if (!$('a[data-analytics-settings]').length) $('footer .footer-links').last().append('<a href="#analytics-settings" data-analytics-settings>Analytics preferences</a>');
    $('footer [data-social-links]').remove();
    $('footer .footer-main').append('<div data-social-links><h2 class="footer-title">Follow Zanove</h2><nav class="footer-links" aria-label="Zanove social links"><a href="https://x.com/ZanoveTech" target="_blank" rel="noopener noreferrer">X <span aria-hidden="true">↗</span></a><a href="https://www.instagram.com/zanovetech/" target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a><a href="https://www.linkedin.com/in/obasivera/" target="_blank" rel="noopener noreferrer">Obasi Vera · Founder on LinkedIn <span aria-hidden="true">↗</span></a></nav></div>');
    const slug = name.replace(/\.html$/, '');
    const canonical = `${site}/blog/${slug}`;
    $('a[href="../blog.html"], a[href="/blog.html"], a[href="blog.html"]').attr('href', '/blog');
    $('a[href="../service.html"], a[href="service.html"]').attr('href', '/service.html');
    $('a[href="../project.html"], a[href="project.html"]').attr('href', '/project.html');
    $('a[href="../audit.html"], a[href="audit.html"]').attr('href', '/audit.html');
    $('head link[rel="canonical"]').attr('href', canonical);
    $('head meta[property="og:url"]').attr('content', canonical);
    $('head meta[property="og:image"], head meta[name="twitter:image"]').attr('content', `${site}/assets/zanove-social.jpg`);
    const schemaScript = $('head script[type="application/ld+json"][data-zanove-schema]');
    if (schemaScript.length) {
      try {
        const schema = JSON.parse(schemaScript.text());
        schema.mainEntityOfPage = canonical;
        if (schema.publisher) schema.publisher.url = `${site}/`;
        schemaScript.text(JSON.stringify(schema));
      } catch { /* Preserve source if parsing fails. */ }
    }
    fs.writeFileSync(filename, $.html());
  }
}
fs.cpSync(path.join(root, 'assets'), path.join(root, 'public', 'assets'), { recursive: true, force: true });
const llmsPath = path.join(root, 'public', 'llms.txt');
if (fs.existsSync(llmsPath)) {
  let llms = fs.readFileSync(llmsPath, 'utf8').replaceAll('https://zanovetech.vercel.app', site);
  const corePageDescriptions = {
    Home: 'Digital products, websites and business systems.',
    Services: 'Website design, software, digital products, AI creative, automation and growth.',
    'About Zanove': 'Zanove Technologies and its approach.',
    Projects: 'Founder-built product, web, AI and creative work.',
    'Website audit': 'First-pass public website review and project contact path.',
    'Request a consultation': 'Discuss a website, product, software or workflow.',
    Blog: 'Practical writing on websites, AI and digital growth.',
    Books: 'Books by Vera, with links to their Selar listings.',
    'Ask Zanove AI': "AI assistant for questions about Zanove's services and work.",
    'Privacy & analytics': 'Analytics choices and information submitted to Zanove.',
  };
  for (const service of services) corePageDescriptions[service.name] = service.description;
  const corePages = [
    '## Core pages',
    ...sitePageLinks.map(([label, route]) => `- [${label}](${site}${route}): ${corePageDescriptions[label]}`),
  ].join('\n');
  const articles = ['## Journal articles', ...posts.map(({ title, slug }) => `- [${title}](${site}/blog/${slug})`)].join('\n');
  llms = llms.replace(/## Core pages[\s\S]*?(?=\n## |$)/, corePages);
  llms = llms.replace(/## Journal articles[\s\S]*?(?=\n## |$)/, articles);
  const projects = [
    '## Founder-built projects',
    '- [Zanvera Guest Hub](https://zanvera.vercel.app/): QR-led AI guest assistant for independent hotels and rental hosts.',
    '- [No Wahala](https://no-wahala.vercel.app/): Statement-based personal finance dashboard for understanding income, spending and repeat payments.',
    '- [LegacyMag](https://v0-birthday-booklet-landing-page.vercel.app/): Premium milestone and memorial booklet service.',
    '- [DataWise](https://datawise-three.vercel.app/): Nigerian data bundle comparison and personal tracking experience.',
    '- [GlobalPerks](https://dark-rosy.vercel.app/): Visual storytelling portfolio and gallery experience.',
  ].join('\n');
  llms = llms.replace(/## Founder-built projects[\s\S]*?(?=\n## |$)/, projects);
  if (!llms.includes('## Founder-built projects')) llms = llms.replace('## Contact', `${projects}\n\n## Contact`);
  llms = llms.replace(/- WhatsApp:[^\n]*\n/g, '');
  llms = llms.replace('- Email: zanovetechnologies@gmail.com', `- Email: zanovetechnologies@gmail.com\n- WhatsApp: https://wa.me/2349138638126`);
  fs.writeFileSync(llmsPath, llms);
}
