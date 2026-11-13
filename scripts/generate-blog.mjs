import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { sanitizeBlogHtml } from '../lib/sanitize-blog-html.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');
const posts = JSON.parse(fs.readFileSync(path.join(root, 'content/blog-posts.json'), 'utf8'));
const authors = JSON.parse(fs.readFileSync(path.join(root, 'content/blog-authors.json'), 'utf8'));
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const blogPath = path.join(root, 'blog.html');
const listing = load(fs.readFileSync(blogPath, 'utf8'));
listing('.blog-list').html(posts.map((post) => `<article class="blog-card"><p class="project-kicker">${escape(post.category)}</p><h2><a href="/blog/${post.slug}">${escape(post.title)}</a></h2><p>${escape(post.description)}</p><a class="card-link" href="/blog/${post.slug}">Read the article <span aria-hidden="true">↗</span></a></article>`).join('')).addClass('blog-card-grid');
listing('head title').text('Zanove Journal | Websites, AI & Digital Growth');
for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) listing(selector).attr('content', 'Zanove Journal | Websites, AI & Digital Growth');
listing('head link[rel="canonical"]').attr('href', `${site}/blog`);
listing('head meta[property="og:url"]').attr('content', `${site}/blog`);
fs.writeFileSync(blogPath, listing.html());

const out = path.join(root, 'public/blog');
fs.mkdirSync(out, { recursive: true });
for (const post of posts) {
  const $ = load(fs.readFileSync(blogPath, 'utf8'));
  const titleTag = post.seoTitle || `${post.title} | Zanove Journal`;
  const metaDescription = post.metaDescription || post.description;
  const canonical = `${site}/blog/${post.slug}`;
  $('head title').text(titleTag);
  $('head meta[name="description"]').attr('content', metaDescription);
  $('head link[rel="canonical"]').attr('href', canonical);
  $('head meta[property="og:title"], head meta[name="twitter:title"]').attr('content', titleTag);
  $('head meta[property="og:description"], head meta[name="twitter:description"]').attr('content', metaDescription);
  $('head meta[property="og:type"]').attr('content', 'article');
  $('head meta[property="og:url"]').attr('content', canonical);
  const socialImage = post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${site}${post.coverImage}`) : `${site}/assets/zanove-social.jpg`;
  $('head meta[property="og:image"], head meta[name="twitter:image"]').attr('content', socialImage);
  $('head script[type="application/ld+json"][data-zanove-schema]').remove();
  const author = authors.find((entry) => entry.id === post.authorId) || authors[0];
  const isFounderAuthor = author && (author.id === 'obasi-vera' || author.name.trim().toLowerCase() === 'obasi vera');
  const schemaAuthor = author && author.id !== 'zanove-technologies' ? { '@type': 'Person', '@id': `${site}/#author-${author.id}`, name: author.name, ...(author.role ? { jobTitle: author.role } : {}), ...(author.bio ? { description: author.bio } : {}), ...(author.image ? { image: author.image.startsWith('http') ? author.image : `${site}${author.image}` } : {}), ...(isFounderAuthor ? { sameAs: ['https://www.linkedin.com/in/obasivera/'] } : {}) } : { '@id': `${site}/#organization` };
  const schema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: metaDescription, ...((post.focusKeyword || post.secondaryKeywords?.length || post.tags?.length) ? { keywords: [...new Set([post.focusKeyword, ...(post.secondaryKeywords || []), ...(post.tags || [])].filter(Boolean))] } : {}), ...(post.coverImage ? { image: socialImage } : {}), mainEntityOfPage: canonical, ...(post.datePublished ? { datePublished: post.datePublished } : {}), ...(post.dateModified ? { dateModified: post.dateModified } : {}), author: schemaAuthor, publisher: { '@id': `${site}/#organization` } };
  $('head').append(`<script type="application/ld+json" data-zanove-schema>${JSON.stringify(schema)}</script>`);

  const renderBlock = (block) => {
    if (block.type === 'subheading') return `<h3>${escape(block.text)}</h3>`;
    if (block.type === 'quote') return `<blockquote>${escape(block.text)}</blockquote>`;
    if (block.type === 'image') return `<figure class="article-image"><img src="${escape(block.src)}" alt="${escape(block.alt)}" loading="lazy">${block.caption ? `<figcaption>${escape(block.caption)}</figcaption>` : ''}</figure>`;
    if (block.type === 'richtext') return `<div class="article-richtext">${sanitizeBlogHtml(block.html || '')}</div>`;
    return `<p>${escape(block.text)}</p>`;
  };
  const sections = post.sections.map((section) => {
    const blocks = section.blocks || (section.paragraphs || []).map((text) => ({ type: 'paragraph', text }));
    return `<section><h2>${escape(section.heading)}</h2>${blocks.map(renderBlock).join('')}</section>`;
  }).join('');
  const resourceLinks = (post.resourceLinks || []).filter((link) => link?.label && (link.type === 'internal' ? link.url?.startsWith('/') && !link.url.startsWith('//') : /^https:\/\//i.test(link.url || '')));
  const resources = resourceLinks.length ? `<nav class="article-resources" aria-label="Article resources"><h2>Useful links and sources</h2><ul>${resourceLinks.map((link) => `<li><a href="${escape(link.url)}"${link.type === 'external' ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(link.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></nav>` : '';
  const authorName = author?.name || 'Zanove Technologies';
  const cover = post.coverImage ? `<div class="container journal-cover"><img src="${escape(post.coverImage)}" alt="${escape(post.coverAlt || '')}"></div>` : '';
  const authorCard = author ? `<aside class="article-author-card">${author.image ? `<div class="article-author-avatar"><img src="${escape(author.image)}" alt=""></div>` : ''}<div><p class="eyebrow">About the author</p><h3>${escape(author.name)}</h3>${author.role ? `<p class="author-role">${escape(author.role)}</p>` : ''}<p>${escape(author.bio)}</p>${isFounderAuthor ? '<a class="card-link" href="https://www.linkedin.com/in/obasivera/" target="_blank" rel="noopener noreferrer">Connect with Obasi on LinkedIn <span aria-hidden="true">↗</span></a>' : ''}</div></aside>` : '';
  const tagsHtml = post.tags?.length ? `<div class="article-tags" aria-label="Article topics"><span>Topics</span>${post.tags.map((tag) => `<span class="article-tag">${escape(tag)}</span>`).join('')}</div>` : '';
  $('main').html(`<div class="container article-back"><a href="/blog">← All Zanove Journal articles</a></div><section class="page-hero"><div class="container"><p class="eyebrow">${escape(post.category)}</p><h1>${escape(post.title)}</h1><p class="lead">${escape(post.description)}</p><p class="article-byline">By ${escape(authorName)}${post.datePublished ? ` · Published <time datetime="${escape(post.datePublished)}">${escape(new Date(post.datePublished).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }))}</time>` : ''}</p></div></section>${cover}<section class="section"><article class="container article-content"><p class="blog-lead">${escape(post.description)}</p>${sections}${resources}${tagsHtml}${authorCard}<div class="article-service-links"><p class="eyebrow">A practical next step</p><h2>Need help applying this to your business?</h2><p>Explore the relevant Zanove service or tell us what you are trying to improve. We can help you choose a clear next step.</p><div class="hero-actions"><a class="button" href="/service.html">Explore our services <span aria-hidden="true">↗</span></a><a class="button button-secondary" href="/project.html">Request a consultation <span aria-hidden="true">↗</span></a></div></div></article></section>`);

  $('header .brand, footer .footer-brand').find('a').attr('href', '/');
  $('header .brand img, footer .footer-brand img').attr('src', '/assets/zanove-logo.png');
  $('header a, footer a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !/^(https?:|mailto:|#|\/)/.test(href)) $(el).attr('href', `/${href}`);
  });
  $('head link[rel="icon"]').attr('href', '/assets/zanove-favicon.svg');
  $('head link[href*="zanove-site.css"]').attr('href', '/assets/zanove-site.css?v=20261112-blog-editor');
  $('head script[src*="zanove-ui.js"]').attr('src', '/assets/zanove-ui.js?v=20261111-blog');
  $('body script[src*="zanove-ask.js"], body .ask-widget').remove();
  fs.writeFileSync(path.join(out, `${post.slug}.html`), $.html());
}
console.log(`Generated ${posts.length} individual article pages.`);
