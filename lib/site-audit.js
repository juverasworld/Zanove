import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';

const MAX_HTML_BYTES = 1_000_000;
const MAX_PAGES = 4;
const FETCH_TIMEOUT_MS = 8_000;
const DNS_TIMEOUT_MS = 2_500;
const AUDIT_BUDGET_MS = 40_000;

function isPublicAddress(address) {
  try {
    const parsed = ipaddr.parse(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

async function assertPublicHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('This address is not a public website.');
  }
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error('This address is not a public website.');
    return;
  }
  let dnsTimer;
  let addresses;
  try {
    addresses = await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise((_, reject) => { dnsTimer = setTimeout(() => reject(new Error('This website took too long to resolve.')), DNS_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(dnsTimer);
  }
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('This website resolves to a non-public network address.');
  }
}

async function readLimited(response) {
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_HTML_BYTES) throw new Error('This page is too large to inspect safely.');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error('This page is too large to inspect safely.');
    }
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder('utf-8', { fatal: false }).decode(result);
}

async function fetchPublicHtml(input) {
  let url = new URL(input);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) {
      throw new Error('Only public HTTP or HTTPS pages can be audited.');
    }
    await assertPublicHost(url.hostname);
    const controller = new AbortController();
    const started = performance.now();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ZanoveSiteReview/1.0 (+https://zanove.example; public-page quality review)',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        },
      });
      const elapsedMs = Math.round(performance.now() - started);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects === 4) throw new Error('This website redirects too many times.');
        const location = response.headers.get('location');
        if (!location) throw new Error('This website returned an invalid redirect.');
        url = new URL(location, url);
        continue;
      }
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return { url: url.href, status: response.status, contentType, elapsedMs, html: '', error: 'The URL did not return an HTML page.' };
      }
      const html = await readLimited(response);
      return { url: url.href, status: response.status, contentType, elapsedMs: Math.round(performance.now() - started), html };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('This website could not be reached.');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function analyzeHtml(page, textLimit = 3500) {
  if (!page.html) return { ...page, title: '', description: '', canonical: '', h1: [], headings: [], viewport: false, lang: '', images: 0, imagesMissingAlt: 0, links: 0, emptyLinks: 0, internalLinks: [], hasNavigation: false, hasMain: false, forms: 0, unlabeledFields: 0, emailLinks: 0, phoneLinks: 0, text: '' };
  const $ = load(page.html);
  const title = normalizeText($('title').first().text());
  const description = normalizeText($('meta[name="description" i]').attr('content'));
  const canonical = normalizeText($('link[rel="canonical" i]').attr('href'));
  const viewport = Boolean($('meta[name="viewport" i]').length);
  const lang = normalizeText($('html').attr('lang'));
  const h1 = $('h1').map((_, element) => normalizeText($(element).text())).get().filter(Boolean);
  const headings = $('h1,h2,h3,h4').map((_, element) => ({ level: Number(element.tagName.slice(1)), text: normalizeText($(element).text()).slice(0, 140) })).get().filter((item) => item.text).slice(0, 45);
  const images = $('img').length;
  const imagesMissingAlt = $('img').filter((_, element) => typeof $(element).attr('alt') === 'undefined' && !$(element).attr('aria-hidden')).length;
  const links = $('a').length;
  const emptyLinks = $('a').filter((_, element) => !normalizeText($(element).text()) && !$(element).find('img[alt],svg[aria-label],[aria-label]').length).length;
  const internalLinks = [];
  $('a[href]').each((_, element) => {
    if (internalLinks.length >= 40) return;
    try {
      const link = new URL($(element).attr('href'), page.url);
      if (link.origin !== new URL(page.url).origin || !['http:', 'https:'].includes(link.protocol)) return;
      link.hash = '';
      link.search = '';
      if (!/\.(pdf|png|jpe?g|gif|webp|svg|zip|docx?|xlsx?|pptx?)$/i.test(link.pathname)) internalLinks.push(link.href);
    } catch { /* Ignore malformed links in source HTML. */ }
  });
  const formCount = $('form').length;
  const formFields = $('form input:not([type="hidden"]),form select,form textarea');
  const unlabeledFields = formFields.filter((_, element) => {
    const field = $(element);
    const id = field.attr('id');
    const hasForLabel = id && $('label').toArray().some((label) => $(label).attr('for') === id);
    return !field.attr('aria-label') && !field.attr('aria-labelledby') && !field.closest('label').length && !hasForLabel;
  }).length;
  const hasNavigation = Boolean($('nav,[role="navigation"]').length);
  const hasMain = Boolean($('main,[role="main"]').length);
  const body = $('body');
  body.find('script,style,noscript,svg,iframe,template,nav,footer').remove();
  const text = normalizeText(body.text()).slice(0, textLimit);
  return {
    url: page.url, status: page.status, elapsedMs: page.elapsedMs, contentType: page.contentType,
    title, titleLength: title.length, description, descriptionLength: description.length, canonical,
    viewport, lang, h1, headings, images, imagesMissingAlt, links, emptyLinks,
    internalLinks: [...new Set(internalLinks)], hasNavigation, hasMain, forms: formCount, unlabeledFields,
    emailLinks: $('a[href^="mailto:"]').length, phoneLinks: $('a[href^="tel:"]').length, text,
  };
}

export async function inspectWebsite(startUrl) {
  const started = performance.now();
  const queue = [startUrl];
  const seen = new Set();
  const pages = [];
  const failures = [];
  let bytesRead = 0;
  let crawlOrigin = new URL(startUrl).origin;

  while (queue.length && pages.length < MAX_PAGES) {
    if (performance.now() - started >= AUDIT_BUDGET_MS) break;
    const candidate = queue.shift();
    const parsedCandidate = new URL(candidate);
    parsedCandidate.hash = '';
    parsedCandidate.search = '';
    const normalized = parsedCandidate.href;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    try {
      const fetched = await fetchPublicHtml(normalized);
      bytesRead += Buffer.byteLength(fetched.html || '', 'utf8');
      if (!fetched.html) {
        failures.push({ url: fetched.url, status: fetched.status, note: fetched.error });
        continue;
      }
      const page = analyzeHtml(fetched, pages.length === 0 ? 6500 : 3500);
      pages.push(page);
      if (pages.length === 1) crawlOrigin = new URL(page.url).origin;
      const priorities = /contact|service|about|product|work|portfolio|faq|pricing|solution/i;
      const nextLinks = page.internalLinks
        .filter((href) => new URL(href).origin === crawlOrigin && !seen.has(href))
        .sort((a, b) => Number(priorities.test(new URL(b).pathname)) - Number(priorities.test(new URL(a).pathname)));
      queue.push(...nextLinks.slice(0, 14));
    } catch (error) {
      failures.push({ url: normalized, note: error.name === 'AbortError' ? 'Page request timed out.' : error.message });
    }
  }

  if (!pages.length) throw new Error(failures[0]?.note || 'We could not fetch any public HTML pages from this website.');
  const stats = {
    requestedUrl: startUrl,
    pagesReviewed: pages.length,
    pageLimit: MAX_PAGES,
    bytesRead,
    internalLinksFound: pages.reduce((total, page) => total + page.internalLinks.length, 0),
    failedPages: failures,
    pages: pages.map(({ text, internalLinks, ...page }) => page),
    pageContent: pages.map((page) => ({ url: page.url, text: page.text })),
  };
  return stats;
}
