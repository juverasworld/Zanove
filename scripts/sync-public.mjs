import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import posts from '../content/blog-posts.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'service.html', 'about.html', 'projects.html', 'audit.html', 'blog.html', 'ebook.html', 'ask-ai.html', 'project.html'];
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanove-technologies.vercel.app').replace(/\/$/, '');
for (const page of pages) {
  const source = path.join(root, page);
  const $ = load(fs.readFileSync(source, 'utf8'));
  $('link[rel="stylesheet"][href*="zanove-site.css"]').attr('href', 'assets/zanove-site.css?v=20261111-home-audit');
  $('script[src*="zanove-ui.js"]').attr('src', 'assets/zanove-ui.js?v=20261111-home-audit');
  $('script[src*="zanove-audit.js"]').attr('src', 'assets/zanove-audit.js?v=20261111-home-audit');
  $('a.nav-cta').attr('href', 'project.html').html('Discuss a project <span aria-hidden="true">↗</span>');
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
    $('link[rel="stylesheet"][href*="zanove-site.css"]').attr('href', `${site}/assets/zanove-site.css?v=20261111-home-audit`);
    $('script[src*="zanove-ui.js"]').attr('src', `${site}/assets/zanove-ui.js?v=20261111-home-audit`);
    $('script[src*="zanove-audit.js"]').attr('src', `${site}/assets/zanove-audit.js?v=20261111-home-audit`);
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
  llms = llms.replace(/- WhatsApp:[^\n]*\n/g, '');
  llms = llms.replace('- Email: zanovetechnologies@gmail.com', `- Email: zanovetechnologies@gmail.com\n- WhatsApp: https://wa.me/2349138638126`);
  fs.writeFileSync(llmsPath, llms);
}
