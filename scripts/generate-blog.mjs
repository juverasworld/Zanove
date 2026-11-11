import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanove-technologies.vercel.app').replace(/\/$/, '');
const posts = JSON.parse(fs.readFileSync(path.join(root, 'content/blog-posts.json'), 'utf8'));
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const blogPath = path.join(root, 'blog.html');
const listing = load(fs.readFileSync(blogPath, 'utf8'));
listing('.blog-list').html(posts.map((post) => `<article class="blog-card"><p class="project-kicker">${escape(post.category)}</p><h2><a href="blog/${post.slug}.html">${escape(post.title)}</a></h2><p>${escape(post.description)}</p><a class="card-link" href="blog/${post.slug}.html">Read the article <span aria-hidden="true">↗</span></a></article>`).join('')).addClass('blog-card-grid');
listing('head title').text('Zanove Journal | Websites, AI & Digital Growth');
for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) listing(selector).attr('content', 'Zanove Journal | Websites, AI & Digital Growth');
listing('head link[rel="canonical"]').attr('href', `${site}/blog.html`);
listing('head meta[property="og:url"]').attr('content', `${site}/blog.html`);
fs.writeFileSync(blogPath, listing.html());

const out = path.join(root, 'public/blog');
fs.mkdirSync(out, { recursive: true });
for (const post of posts) {
  const $ = load(fs.readFileSync(blogPath, 'utf8'));
  const titleTag = `${post.title} | Zanove Journal`;
  const canonical = `${site}/blog/${post.slug}.html`;
  $('head title').text(titleTag);
  $('head meta[name="description"]').attr('content', post.description);
  $('head link[rel="canonical"]').attr('href', canonical);
  $('head meta[property="og:title"], head meta[name="twitter:title"]').attr('content', titleTag);
  $('head meta[property="og:description"], head meta[name="twitter:description"]').attr('content', post.description);
  $('head meta[property="og:type"]').attr('content', 'article');
  $('head meta[property="og:url"]').attr('content', canonical);
  $('head meta[property="og:image"], head meta[name="twitter:image"]').attr('content', `${site}/assets/zanove-social.jpg`);
  $('head script[type="application/ld+json"][data-zanove-schema]').remove();
  const schema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.description, mainEntityOfPage: canonical, publisher: { '@type': 'Organization', name: 'Zanove Technologies', url: `${site}/` } };
  $('head').append(`<script type="application/ld+json" data-zanove-schema>${JSON.stringify(schema)}</script>`);

  const sections = post.sections.map((section) => `<section><h2>${escape(section.heading)}</h2>${section.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('')}</section>`).join('');
  $('main').html(`<div class="container article-back"><a href="../blog.html">← All articles</a></div><section class="page-hero"><div class="container"><p class="eyebrow">${escape(post.category)}</p><h1>${escape(post.title)}</h1><p class="lead">${escape(post.description)}</p></div></section><section class="section"><article class="container article-content"><p class="blog-lead">${escape(post.description)}</p>${sections}<a class="card-link" href="${escape(post.link.href)}">${escape(post.link.label)} <span aria-hidden="true">↗</span></a></article></section><section class="section"><div class="container cta-band"><div><p class="eyebrow">Want help applying this?</p><h2>Turn the idea into a practical next step.</h2><p>Tell Zanove about the challenge your business is working through.</p></div><a class="button" href="../audit.html">Start a conversation <span aria-hidden="true">↗</span></a></div></section>`);

  $('header .brand, footer .footer-brand').find('a').attr('href', '../index.html');
  $('header .brand img, footer .footer-brand img').attr('src', '../assets/zanove-logo.png');
  $('header a, footer a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !/^(https?:|mailto:|#|\.\.)/.test(href)) $(el).attr('href', `../${href}`);
  });
  $('head link[rel="icon"]').attr('href', '../assets/zanove-favicon.svg');
  $('head link[href*="zanove-site.css"]').attr('href', '../assets/zanove-site.css?v=20261110-seo');
  $('head script[src*="zanove-ui.js"]').attr('src', '../assets/zanove-ui.js?v=20261110-seo');
  $('body script[src*="zanove-ask.js"], body .ask-widget').remove();
  fs.writeFileSync(path.join(out, `${post.slug}.html`), $.html());
}
console.log(`Generated ${posts.length} individual article pages.`);
