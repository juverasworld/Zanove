import { sanitizeBlogHtml } from '../../../../lib/sanitize-blog-html.mjs';
import { checkBlogRequestAuthorization } from '../../../../lib/blog-request-auth.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const postsPath = 'content/blog-posts.json';
const authorsPath = 'content/blog-authors.json';
const DEFAULT_AUTHOR_ID = 'zanove-technologies';
const DEFAULT_AUTHOR = {
  id: DEFAULT_AUTHOR_ID,
  name: 'Zanove Technologies',
  role: 'Editorial team',
  bio: 'Practical perspectives on websites, software, AI and digital growth for Nigerian businesses.',
  image: '',
};
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });

function githubConfig() {
  const repository = process.env.GITHUB_REPOSITORY || 'juverasworld/Zanove';
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !/^[^/]+\/[^/]+$/.test(repository)) return null;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  return { repository, token, branch, headers };
}

function contentUrl(config, filePath) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${config.repository}/contents/${encodedPath}`;
}

async function readFile(config, filePath) {
  const response = await fetch(`${contentUrl(config, filePath)}?ref=${encodeURIComponent(config.branch)}`, { headers: config.headers, cache: 'no-store' });
  if (response.status === 404) return { entries: [], sha: undefined };
  if (!response.ok) throw new Error(`GitHub returned ${response.status} while reading journal data.`);
  const file = await response.json();
  const entries = JSON.parse(Buffer.from(String(file.content || '').replace(/\s/g, ''), 'base64').toString('utf8'));
  if (!Array.isArray(entries)) throw new Error('Journal data must contain a JSON array.');
  return { entries, sha: file.sha };
}

async function writeFile(config, filePath, entries, sha, message) {
  const response = await fetch(contentUrl(config, filePath), {
    method: 'PUT', headers: config.headers,
    body: JSON.stringify({ message, content: Buffer.from(`${JSON.stringify(entries, null, 2)}\n`).toString('base64'), ...(sha ? { sha } : {}), branch: config.branch }),
    cache: 'no-store',
  });
  if (response.ok) return;
  const details = await response.json().catch(() => ({}));
  if (response.status === 409 || response.status === 422) throw new Error('The journal changed while you were editing. Refresh the dashboard and try again.');
  if (response.status === 403 && /resource not accessible by personal access token/i.test(details.message || '')) {
    throw new Error('GitHub blocked this save because the GITHUB_TOKEN does not have write access. In GitHub, edit or replace the fine-grained token for juverasworld/Zanove and grant Repository permissions → Contents: Read and write. Then update GITHUB_TOKEN in the Vercel project for Production (and Preview if needed) and redeploy.');
  }
  if (response.status === 401) {
    throw new Error('GitHub rejected the GITHUB_TOKEN. Replace it with a valid fine-grained token that can access juverasworld/Zanove, update it in Vercel, and redeploy.');
  }
  throw new Error(`GitHub could not save this item${details.message ? `: ${details.message}` : '.'}`);
}

async function readInput(request) {
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 60000) return { error: 'This request is too large.' };
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'The request details are not valid JSON.' };
    return input;
  } catch { return { error: 'The request details are not valid JSON.' }; }
}

function parseLegacyBody(raw) {
  const sections = [];
  let current = { heading: 'The challenge', blocks: [] };
  for (const block of raw.replace(/\r/g, '').split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean)) {
    if (block.startsWith('## ')) {
      if (current.blocks.length) sections.push(current);
      current = { heading: block.replace(/^##\s+/, '').trim(), blocks: [] };
    } else current.blocks.push({ type: 'paragraph', text: block.replace(/^#+\s*/, '') });
  }
  if (current.blocks.length) sections.push(current);
  return sections;
}

function normalizeSections(input) {
  if (!Array.isArray(input.sections)) return typeof input.body === 'string' ? parseLegacyBody(input.body) : null;
  if (!input.sections.length || input.sections.length > 40) return null;
  const sections = [];
  for (const section of input.sections) {
    const heading = String(section?.heading || '').trim();
    if (!heading || heading.length > 180) return null;
    let blocks = Array.isArray(section.blocks) ? section.blocks : null;
    if (!blocks && Array.isArray(section.paragraphs)) blocks = section.paragraphs.map((text) => ({ type: 'paragraph', text }));
    if (!blocks || !blocks.length || blocks.length > 80) return null;
    const normalized = [];
    for (const block of blocks) {
      const type = String(block?.type || 'paragraph');
      if (type === 'richtext') {
        const html = sanitizeBlogHtml(String(block.html || ''));
        const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        if (!text || html.length > 18000) return null;
        normalized.push({ type, html });
      } else if (type === 'paragraph' || type === 'subheading' || type === 'quote') {
        const text = String(block.text || '').trim();
        const max = type === 'quote' ? 2000 : type === 'subheading' ? 180 : 12000;
        if (!text || text.length > max) return null;
        normalized.push({ type, text });
      } else if (type === 'image') {
        const src = String(block.src || '').trim();
        const alt = String(block.alt || '').trim();
        const caption = String(block.caption || '').trim();
        const allowed = src.startsWith('/assets/blog/') || /^https:\/\//i.test(src);
        if (!allowed || !alt || alt.length > 240 || caption.length > 300) return null;
        normalized.push({ type, src, alt, ...(caption ? { caption } : {}) });
      } else return null;
    }
    sections.push({ heading, blocks: normalized });
  }
  return sections;
}

function validatePost(input) {
  const slug = String(input.slug || '').trim();
  const title = String(input.title || '').trim();
  const seoTitle = String(input.seoTitle || '').trim();
  const category = String(input.category || '').trim();
  const description = String(input.description || '').trim();
  const metaDescription = String(input.metaDescription || description).trim();
  const focusKeyword = String(input.focusKeyword || '').trim();
  const backlinkNotes = String(input.backlinkNotes || '').trim().slice(0, 3000);
  const listTerms = (value, limit, maxLength) => Array.isArray(value) ? [...new Set(value.map((term) => String(term || '').trim()).filter(Boolean))].slice(0, limit).filter((term) => term.length <= maxLength) : [];
  const secondaryKeywords = listTerms(input.secondaryKeywords, 20, 100);
  const tags = listTerms(input.tags, 20, 50);
  const resourceLinks = Array.isArray(input.resourceLinks) ? input.resourceLinks.slice(0, 30).map((link) => ({
    type: link?.type === 'external' ? 'external' : 'internal',
    label: String(link?.label || '').trim().slice(0, 120),
    url: String(link?.url || '').trim().slice(0, 500),
  })).filter((link) => link.label && (link.type === 'internal' ? link.url.startsWith('/') && !link.url.startsWith('//') : /^https:\/\//i.test(link.url))) : [];
  const authorId = String(input.authorId || DEFAULT_AUTHOR_ID).trim();
  const coverImage = String(input.coverImage || '').trim();
  const coverAlt = String(input.coverAlt || '').trim();
  const safeImagePath = (value) => !value || value.startsWith('/assets/blog/') || /^https:\/\//i.test(value);
  const sections = normalizeSections(input);
  const contentSize = JSON.stringify(sections || []).length;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90 || !title || title.length > 120 || seoTitle.length > 120 || !category || category.length > 60 || !description || description.length > 180 || !metaDescription || metaDescription.length > 180 || focusKeyword.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(authorId) || !sections || contentSize > 60000 || !safeImagePath(coverImage) || (coverImage && !coverAlt)) {
    return { error: 'Check the title, slug, category, excerpt, author, images and article sections.' };
  }
  return { slug, title, seoTitle, category, description, metaDescription, focusKeyword, secondaryKeywords, tags, resourceLinks, backlinkNotes, authorId, coverImage, coverAlt, sections };
}

function validateAuthor(input) {
  const value = input.profile || input;
  const id = String(value.id || '').trim().toLowerCase();
  const name = String(value.name || '').trim();
  const role = String(value.role || '').trim();
  const bio = String(value.bio || '').trim();
  const image = String(value.image || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 70 || !name || name.length > 100 || role.length > 100 || !bio || bio.length > 400 || (image && !image.startsWith('/assets/blog/') && !/^https:\/\//i.test(image))) {
    return { error: 'Check the profile name, URL ID, role, short bio and photo.' };
  }
  return { id, name, role, bio, image };
}

async function guard(request) {
  const authorizationError = checkBlogRequestAuthorization(request);
  if (authorizationError) return json({ error: authorizationError.error }, authorizationError.status);
  const config = githubConfig();
  if (!config) return json({ error: 'Blog publishing needs a server-side GitHub token configured.' }, 503);
  return config;
}

export async function GET(request) {
  const config = await guard(request);
  if (config instanceof Response) return config;
  try {
    const [{ entries: posts }, { entries: authors }] = await Promise.all([readFile(config, postsPath), readFile(config, authorsPath)]);
    return json({ ok: true, posts, authors: authors.length ? authors : [DEFAULT_AUTHOR] });
  } catch (error) {
    console.error('Blog dashboard read failed:', error.message);
    return json({ error: 'The journal could not be loaded. Check GitHub access and try again.' }, 502);
  }
}

async function saveAuthor(config, input) {
  const author = validateAuthor(input);
  if (author.error) return json({ error: author.error }, 400);
  try {
    const { entries: currentAuthors, sha } = await readFile(config, authorsPath);
    const authors = currentAuthors.length ? currentAuthors : [DEFAULT_AUTHOR];
    const index = authors.findIndex((entry) => entry.id === author.id);
    if (index >= 0) authors[index] = author;
    else authors.unshift(author);
    await writeFile(config, authorsPath, authors, sha, `${index >= 0 ? 'Update' : 'Create'} journal author profile: ${author.name}`);
    return json({ ok: true, action: index >= 0 ? 'updated' : 'created', authors });
  } catch (error) {
    console.error('Blog author save failed:', error.message);
    return json({ error: error.message || 'The author profile could not be saved.' }, 502);
  }
}

export async function POST(request) {
  const config = await guard(request);
  if (config instanceof Response) return config;
  const input = await readInput(request);
  if (input.error) return json({ error: input.error }, input.error === 'This request is too large.' ? 413 : 400);
  if (input.kind === 'author') return saveAuthor(config, input);
  const postInput = validatePost(input);
  if (postInput.error) return json({ error: postInput.error }, 400);

  try {
    const [{ entries: posts, sha }, { entries: storedAuthors }] = await Promise.all([readFile(config, postsPath), readFile(config, authorsPath)]);
    const authors = storedAuthors.length ? storedAuthors : [DEFAULT_AUTHOR];
    if (!authors.some((author) => author.id === postInput.authorId)) return json({ error: 'Choose an author profile that exists in the dashboard.' }, 400);
    const index = posts.findIndex((entry) => entry.slug === postInput.slug);
    const existing = index >= 0 ? posts[index] : null;
    const now = new Date().toISOString();
    const post = { ...postInput, datePublished: existing?.datePublished || now, dateModified: now };
    if (index >= 0) posts[index] = post;
    else posts.unshift(post);
    await writeFile(config, postsPath, posts, sha, `${index >= 0 ? 'Update' : 'Publish'} journal post: ${post.title}`);
    return json({ ok: true, action: index >= 0 ? 'updated' : 'created', posts });
  } catch (error) {
    console.error('Blog publish failed:', error.message);
    return json({ error: error.message.includes('GitHub returned') || error.message.includes('Journal data') ? 'The journal could not be read from GitHub. Check repository access and try again.' : error.message || 'The article could not be saved. Check the publishing setup and try again.' }, 502);
  }
}

export async function DELETE(request) {
  const config = await guard(request);
  if (config instanceof Response) return config;
  const input = await readInput(request);
  if (input.error) return json({ error: input.error }, 400);

  try {
    if (input.kind === 'author') {
      const id = String(input.id || '').trim();
      if (id === DEFAULT_AUTHOR_ID) return json({ error: 'The Zanove editorial profile is kept as the fallback author.' }, 400);
      const [{ entries: storedAuthors, sha }, { entries: posts }] = await Promise.all([readFile(config, authorsPath), readFile(config, postsPath)]);
      const authors = storedAuthors.length ? storedAuthors : [DEFAULT_AUTHOR];
      if (posts.some((post) => post.authorId === id)) return json({ error: 'This profile is assigned to an article. Reassign that article before removing the profile.' }, 409);
      const remaining = authors.filter((author) => author.id !== id);
      if (remaining.length === authors.length) return json({ error: 'That author profile was not found.' }, 404);
      await writeFile(config, authorsPath, remaining, sha, `Remove journal author profile: ${id}`);
      return json({ ok: true, authors: remaining });
    }

    const slug = String(input.slug || '').trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return json({ error: 'The article slug is not valid.' }, 400);
    const { entries: posts, sha } = await readFile(config, postsPath);
    const remaining = posts.filter((entry) => entry.slug !== slug);
    if (remaining.length === posts.length) return json({ error: 'That article was not found.' }, 404);
    await writeFile(config, postsPath, remaining, sha, `Remove journal post: ${slug}`);
    return json({ ok: true, action: 'deleted', slug, posts: remaining });
  } catch (error) {
    console.error('Blog item deletion failed:', error.message);
    return json({ error: error.message || 'The item could not be removed.' }, 502);
  }
}
