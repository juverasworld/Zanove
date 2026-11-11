import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');
const $ = load(fs.readFileSync(path.join(root, 'service.html'), 'utf8'));
const title = 'Privacy & Analytics | Zanove Technologies';
const description = 'Learn how Zanove Technologies handles website analytics choices, website audit requests, consultation enquiries and AI assistant questions.';
$('head title').text(title);
$('head meta[name="description"]').attr('content', description);
$('head link[rel="canonical"]').attr('href', `${site}/privacy.html`);
$('head meta[property="og:title"], head meta[name="twitter:title"]').attr('content', title);
$('head meta[property="og:description"], head meta[name="twitter:description"]').attr('content', description);
$('head meta[property="og:url"]').attr('content', `${site}/privacy.html`);
$('header .nav-links a[aria-current="page"]').removeAttr('aria-current');
$('main').html(`
  <section class="page-hero"><div class="container"><p class="eyebrow">Your choices and your information</p><h1>Privacy &amp; analytics</h1><p class="lead">A clear summary of what this website measures, what you send us, and how to change your analytics choice.</p></div></section>
  <section class="section"><article class="container privacy-content">
    <p class="eyebrow">Updated 11 November 2026</p>
    <h2>Website analytics</h2>
    <p>Vercel Web Analytics and Speed Insights are loaded only after you choose “Accept analytics.” If you reject analytics, these scripts are not loaded. You can change your choice at any time using the Analytics preferences link in the footer. If you withdraw consent after accepting, this browser reloads with analytics disabled.</p>
    <p>When enabled, Web Analytics measures page visits and may use referral source, general location, browser, operating system and device information. Zanove also records limited interaction events, such as audit starts and completions, consultation requests, WhatsApp clicks, project filters, scroll milestones and time actively spent with the page visible. Speed Insights measures real-user page performance. The event design excludes form entries, email addresses, audit URLs and Ask Zanove AI conversation text.</p>
    <p>Google Analytics 4 and Google Tag Manager load only after you accept analytics. Google Analytics measures visits and privacy-safe interaction events; tags configured in Google Tag Manager may also run after consent. Zanove does not send form values, audit addresses or Ask Zanove AI conversation text to analytics. Google's own privacy and data processing terms also apply.</p>
    <p>Vercel provides Web Analytics and Speed Insights. Vercel describes Web Analytics as cookie-free and uses an anonymous, daily-reset visitor identifier; see <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel’s analytics privacy details</a>. These scripts are enabled on this site only after your choice. Google Analytics may use its own measurement technologies. Zanove does not use this setup for advertising or personalized ads.</p>
    <h2>Information you send to Zanove</h2>
    <p>If you request a consultation or full audit report, the information you enter is sent to Zanove so we can respond. If you use Ask Zanove AI, your question is sent to the AI service configured by Zanove to generate an answer. If you choose a human handoff, the details you submit are emailed to Zanove.</p>
    <p>For a website audit, the public web pages at the URL you enter are fetched and analyzed. The address and relevant public page content may be sent to the AI service configured for the audit. Do not enter passwords, private customer records, or other sensitive information.</p>
    <h2>Contact and requests</h2>
    <p>For privacy questions or to ask about information you have submitted, email <a href="mailto:zanovetechnologies@gmail.com">zanovetechnologies@gmail.com</a>. Include enough context for us to locate your request; do not email passwords or payment information.</p>
    <p>Analytics consent applies only to measurement. It is not required to use the website, run an audit, or contact Zanove. Rejecting or withdrawing consent stops analytics scripts from running on subsequent page loads; it cannot recall data already sent. This page summarizes website analytics and is not a full privacy notice for every Zanove service.</p>
  </article></section>`);
fs.writeFileSync(path.join(root, 'privacy.html'), $.html());
