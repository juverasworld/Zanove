import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contentPath = 'content/blog-posts.json';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });

function authorized(request) {
  const expected = process.env.BLOG_ADMIN_TOKEN || '';
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

function githubConfig() {
  const repository = process.env.GITHUB_REPOSITORY || 'juverasworld/Zanove';
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !/^[^/]+\/[^/]+$/.test(repository)) return null;
  const api = `https://api.github.com/repos/${repository}/contents/${contentPath}`;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  return { api, branch, headers };
}

async function readPosts(config) {
  const response = await fetch(`${config.api}?ref=${encodeURIComponent(config.branch)}`, { headers: config.headers, cache: 'no-store' });
  if (response.status === 404) return { posts: [], sha: undefined };
  if (!response.ok) throw new Error(`GitHub returned ${response.status} while reading journal articles.`);
  const file = await response.json();
  const posts = JSON.parse(Buffer.from(String(file.content || '').replace(/\s/g, ''), 'base64').toString('utf8'));
  if (!Array.isArray(posts)) throw new Error('The journal content file must contain an array.');
  return { posts, sha: file.sha };
}

async function writePosts(config, posts, sha, message) {
  const response = await fetch(config.api, {
    method: 'PUT', headers: config.headers,
    body: JSON.stringify({ message, content: Buffer.from(`${JSON.stringify(posts, null, 2)}\n`).toString('base64'), ...(sha ? { sha } : {}), branch: config.branch }),
    cache: 'no-store',
  });
  if (response.ok) return;
  const details = await response.json().catch(() => ({}));
  if (response.status === 409 || response.status === 422) throw new Error('The journal changed while you were editing. Refresh the dashboard and try again.');
  throw new Error(`GitHub could not save this article${details.message ? `: ${details.message}` : '.'}`);
}

function parseBody(raw) {
  const sections = [];
  let current = { heading: 'The challenge', paragraphs: [] };
  for (const block of raw.replace(/\r/g, '').split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean)) {
    if (block.startsWith('## ')) {
      if (current.paragraphs.length) sections.push(current);
      current = { heading: block.replace(/^##\s+/, '').trim(), paragraphs: [] };
    } else {
      current.paragraphs.push(block.replace(/^#+\s*/, ''));
    }
  }
  if (current.paragraphs.length) sections.push(current);
  return sections;
}

function validate(input) {
  const slug = String(input.slug || '').trim();
  const title = String(input.title || '').trim();
  const category = String(input.category || '').trim();
  const description = String(input.description || '').trim();
  const body = String(input.body || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90 || !title || title.length > 120 || !category || category.length > 60 || !description || description.length > 180 || !body || body.length > 40000) {
    return { error: 'Check the slug, title, category, excerpt and article length.' };
  }
  const sections = parseBody(body);
  if (!sections.length || sections.some(({ heading, paragraphs }) => !heading || !paragraphs.length)) return { error: 'Add article text and at least one section heading.' };
  return { slug, title, category, description, sections };
}

async function readInput(request) {
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 60000) return { error: 'This request is too large.' };
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'The article details are not valid JSON.' };
    return input;
  } catch { return { error: 'The article details are not valid JSON.' }; }
}

async function guard(request) {
  if (!authorized(request)) return json({ error: 'Publishing is not authorised. Check the blog admin key.' }, 401);
  if (!originAllowed(request)) return json({ error: 'Invalid request origin.' }, 403);
  const config = githubConfig();
  if (!config) return json({ error: 'Blog publishing needs a server-side GitHub token configured.' }, 503);
  return config;
}

export async function GET(request) {
  const config = await guard(request);
  if (config instanceof Response) return config;
  try {
    const { posts } = await readPosts(config);
    return json({ ok: true, posts });
  } catch (error) {
    console.error('Blog dashboard read failed:', error.message);
    return json({ error: 'The journal could not be loaded. Check GitHub access and try again.' }, 502);
  }
}

export async function POST(request) {
  const config = await guard(request);
  if (config instanceof Response) return config;
  const input = await readInput(request);
  if (input.error) return json({ error: input.error }, input.error === 'This request is too large.' ? 413 : 400);
  const validated = validate(input);
  if (validated.error) return json({ error: validated.error }, 400);

  try {
    const { posts, sha } = await readPosts(config);
    const index = posts.findIndex((entry) => entry.slug === validated.slug);
    const now = new Date().toISOString();
    const existing = index >= 0 ? posts[index] : null;
    const post = {
      ...validated,
      datePublished: existing?.datePublished || now,
      dateModified: now,
      link: { href: '/service.html', label: 'Explore how Zanove can help' },
    };
    if (index >= 0) posts[index] = post;
    else posts.unshift(post);
    await writePosts(config, posts, sha, `${index >= 0 ? 'Update' : 'Publish'} journal post: ${post.title}`);
    return json({ ok: true, action: index >= 0 ? 'updated' : 'created', post: { slug: post.slug, title: post.title }, posts });
  } catch (error) {
    console.error('Blog publish failed:', error.message);
    return json({ error: error.message.includes('GitHub returned') || error.message.includes('journal content') ? 'The journal could not be read from GitHub. Check repository access and try again.' : error.message || 'The article could not be saved. Check the publishing setup and try again.' }, 502);
  }
}

export async function DELETE(request) {
  const config = await guard(request);
  if (config instanceof Response) return config;
  const input = await readInput(request);
  if (input.error) return json({ error: input.error }, 400);
  const slug = String(input.slug || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return json({ error: 'The article slug is not valid.' }, 400);
  try {
    const { posts, sha } = await readPosts(config);
    const remaining = posts.filter((entry) => entry.slug !== slug);
    if (remaining.length === posts.length) return json({ error: 'That article was not found.' }, 404);
    await writePosts(config, remaining, sha, `Remove journal post: ${slug}`);
    return json({ ok: true, action: 'deleted', slug, posts: remaining });
  } catch (error) {
    console.error('Blog deletion failed:', error.message);
    return json({ error: error.message || 'The article could not be removed.' }, 502);
  }
}
