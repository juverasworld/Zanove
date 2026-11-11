import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import posts from '../content/blog-posts.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'service.html', 'about.html', 'projects.html', 'audit.html', 'blog.html', 'ebook.html', 'ask-ai.html', 'project.html', 'privacy.html'];
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanove-technologies.vercel.app').replace(/\/$/, '');
const gaId = /^G-[A-Z0-9]+$/i.test((process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').trim())
  ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID.trim()
  : '';
for (const page of pages) {
  const source = path.join(root, page);
  const $ = load(fs.readFileSync(source, 'utf8'));
  $('link[rel="stylesheet"][href*="zanove-site.css"]').attr('href', 'assets/zanove-site.css?v=20261111-consultation');
  $('script[src*="zanove-ui.js"]').attr('src', 'assets/zanove-ui.js?v=20261111-home-audit');
  $('script[src*="zanove-audit.js"]').attr('src', 'assets/zanove-audit.js?v=20261111-home-audit');
  $('head script[src*="zanove-analytics.js"]').remove();
  $('head').append(`<script src="assets/zanove-analytics.js?v=20261111-analytics" data-ga-measurement-id="${gaId}" defer></script>`);
  if (['index.html', 'audit.html'].includes(page)) {
    $('head script[src*="zanove-project.js"]').remove();
    $('head').append('<script src="assets/zanove-project.js?v=20261111-modal2" defer></script>');
    if (!$('[data-project-inquiry-modal]').length) {
      $('body').append(fs.readFileSync(path.join(root, 'assets/project-inquiry-modal.html'), 'utf8'));
    }
  }
  $('[data-ask-launcher]').each((_, el) => {
    $(el).empty().append('<span class="ask-widget-launcher-mark" aria-hidden="true">Z</span><span>Ask Zanove AI</span>');
    $(el).attr('aria-label', 'Open Ask Zanove AI');
  });
  $('a.nav-cta').attr('href', 'project.html').html('Discuss a project <span aria-hidden="true">↗</span>');
  if (!$('a[href="privacy.html"]').length) $('footer .footer-links').last().append('<a href="privacy.html">Privacy &amp; analytics</a>');
  if (!$('a[data-analytics-settings]').length) $('footer .footer-links').last().append('<a href="#analytics-settings" data-analytics-settings>Analytics preferences</a>');
  $('a[href="mailto:zanovetechnologies@gmail.com"]').filter((_, el) => /book a call/i.test($(el).text())).text('Email Zanove to arrange a call');
  const canonical = page === 'index.html' ? `${site}/` : `${site}/${page}`;
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
        schema.url = `${site}/`;
        schema.logo = `${site}/assets/zanove-logo.png`;
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
    $('link[rel="stylesheet"][href*="zanove-site.css"]').attr('href', `${site}/assets/zanove-site.css?v=20261111-consultation`);
    $('script[src*="zanove-ui.js"]').attr('src', `${site}/assets/zanove-ui.js?v=20261111-home-audit`);
    $('script[src*="zanove-audit.js"]').attr('src', `${site}/assets/zanove-audit.js?v=20261111-home-audit`);
    $('head script[src*="zanove-analytics.js"]').remove();
    $('head').append(`<script src="${site}/assets/zanove-analytics.js?v=20261111-analytics" data-ga-measurement-id="${gaId}" defer></script>`);
    if (!$('a[href="../privacy.html"]').length) $('footer .footer-links').last().append('<a href="../privacy.html">Privacy &amp; analytics</a>');
    if (!$('a[data-analytics-settings]').length) $('footer .footer-links').last().append('<a href="#analytics-settings" data-analytics-settings>Analytics preferences</a>');
    const canonical = `${site}/blog/${name}`;
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
  let llms = fs.readFileSync(llmsPath, 'utf8').replaceAll('https://zanove-technologies.vercel.app', site);
const articles = ['## Journal articles', ...posts.map(({ title, slug }) => `- [${title}](${site}/blog/${slug}.html)`)].join('\n');
  llms = llms.replace(/## Journal articles[\s\S]*?(?=\n## |$)/, articles);
  llms = llms.replace(/- \[Project consultation\][^\n]*\n*/g, '');
  llms = llms.replace('## Journal articles', `- [Project consultation](${site}/project.html): Request a consultation about a website, product, software or workflow.\n\n## Journal articles`);
  llms = llms.replace('## Journal articles', `- [Privacy and analytics](${site}/privacy.html): Analytics choices and information submitted to Zanove.\n\n## Journal articles`);
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
