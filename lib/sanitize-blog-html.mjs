import { load } from 'cheerio';

const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a']);

/** Keep editor markup semantic and safe before it is saved or rendered. */
export function sanitizeBlogHtml(input = '') {
  const $ = load(`<div id="blog-content">${String(input)}</div>`, null, false);
  const root = $('#blog-content');
  root.find('*').toArray().reverse().forEach((element) => {
    const node = $(element);
    const tag = element.tagName?.toLowerCase();
    if (tag === 'div') {
      node.replaceWith(`<p>${node.html() || ''}</p>`);
      return;
    }
    if (!allowedTags.has(tag)) {
      node.replaceWith(node.contents());
      return;
    }
    const href = tag === 'a' ? String(node.attr('href') || '').trim() : '';
    for (const attribute of Object.keys(element.attribs || {})) node.removeAttr(attribute);
    if (tag === 'a' && (/^https:\/\//i.test(href) || href.startsWith('/') && !href.startsWith('//') || /^mailto:/i.test(href))) {
      node.attr('href', href);
      if (/^https:\/\//i.test(href)) node.attr('rel', 'nofollow noopener noreferrer');
    } else if (tag === 'a') node.replaceWith(node.contents());
  });
  return root.html() || '';
}
