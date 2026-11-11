import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanove-technologies.vercel.app').replace(/\/$/, '');
const file = path.join(root, 'project.html');
const $ = load(fs.readFileSync(path.join(root, 'service.html'), 'utf8'));
$('head title').text('Request a Project Consultation | Zanove Technologies');
$('head meta[name="description"]').attr('content', 'Tell Zanove what your business needs to improve. Request a project consultation about a website, software, digital product, AI or workflow automation.');
$('head link[rel="canonical"]').attr('href', `${site}/project.html`);
$('head meta[property="og:title"], head meta[name="twitter:title"]').attr('content', 'Request a Project Consultation | Zanove Technologies');
$('head meta[property="og:description"], head meta[name="twitter:description"]').attr('content', 'Tell Zanove what your business needs to improve. Request a project consultation about a website, software, digital product, AI or workflow automation.');
$('head meta[property="og:url"]').attr('content', `${site}/project.html`);
$('head meta[property="og:image"], head meta[name="twitter:image"]').attr('content', `${site}/assets/zanove-social.jpg`);
$('head script[type="application/ld+json"][data-zanove-schema]').each((_, node) => {
  try {
    const schema = JSON.parse($(node).text());
    if (schema['@type'] === 'Organization') { schema.url = `${site}/`; schema.logo = `${site}/assets/zanove-logo.png`; $(node).text(JSON.stringify(schema)); }
  } catch { /* Keep the original schema visible for debugging. */ }
});
$('head script[src*="zanove-project.js"]').remove();
$('head').append('<script src="assets/zanove-project.js?v=20261111" defer></script>');
$('header .nav-links a[aria-current="page"]').removeAttr('aria-current');
$('header .nav-cta').attr('href', 'project.html').html('Discuss a project <span aria-hidden="true">↗</span>');
$('main').html(`
  <section class="page-hero project-hero"><div class="container"><p class="eyebrow">Project consultation</p><h1>Tell us what your business needs to do better.</h1><p class="lead">Share the challenge. We’ll help you identify a practical next step for a website, software, digital product, AI or workflow project.</p></div></section>
  <section class="section"><div class="container project-enquiry-layout">
    <div class="project-enquiry-intro"><p class="eyebrow">Start with the business need</p><h2>A useful first conversation starts with context.</h2><p>Tell us what you’re trying to improve and how you’d prefer us to reach you. You don’t need a finished brief to get started.</p><div class="project-contact-options"><a class="button button-secondary" href="https://wa.me/2349138638126?text=Hi%20Zanove%2C%20I%27d%20like%20to%20discuss%20a%20project." target="_blank" rel="noopener noreferrer">Message Zanove on WhatsApp <span aria-hidden="true">↗</span></a><a href="mailto:zanovetechnologies@gmail.com?subject=Project%20consultation">zanovetechnologies@gmail.com</a></div></div>
    <form class="project-enquiry-form" data-project-form novalidate>
      <div class="project-form-grid"><label>Your name<input name="name" autocomplete="name" maxlength="100" required></label><label>Business name <span>(optional)</span><input name="business" autocomplete="organization" maxlength="120"></label></div>
      <div class="project-form-grid"><label>Work email<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>WhatsApp number <span>(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="32" placeholder="+234…"></label></div>
      <label>What do you need help with?<select name="service" required><option value="">Choose one</option><option>Website or web design</option><option>Software or digital product</option><option>AI or workflow automation</option><option>AI video, image or creative</option><option>Search, content or digital growth</option><option>Not sure yet</option></select></label>
      <label>What would you like to improve?<textarea name="message" rows="5" maxlength="3000" placeholder="A short description is enough to start." required></textarea></label>
      <label class="project-consent"><input type="checkbox" name="consent" required><span>I agree that Zanove can contact me about this project enquiry.</span></label>
      <label class="project-honeypot" aria-hidden="true">Leave this field empty<input name="website" tabindex="-1" autocomplete="off"></label>
      <button class="button" type="submit" data-project-submit>Request a consultation <span aria-hidden="true">↗</span></button>
      <p class="project-form-status" data-project-status role="status" aria-live="polite"></p>
    </form>
  </div></section>`);
fs.writeFileSync(file, $.html());
