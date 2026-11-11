import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function authorized(request) {
  const expected = process.env.BLOG_ADMIN_TOKEN || '';
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
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

export async function POST(request) {
  if (!authorized(request)) return json({ error: 'Publishing is not authorised.' }, 401);
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'Invalid request origin.' }, 403);

  const repository = process.env.GITHUB_REPOSITORY || 'juverasworld/Zanove';
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !/^[^/]+\/[^/]+$/.test(repository)) return json({ error: 'Blog publishing needs a server-side GitHub token configured.' }, 503);

  let input;
  try {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 60000) return json({ error: 'This post is too large to publish.' }, 413);
    input = await request.json();
  } catch { return json({ error: 'The article details are not valid JSON.' }, 400); }

  const slug = String(input.slug || '').trim();
  const title = String(input.title || '').trim();
  const category = String(input.category || '').trim();
  const description = String(input.description || '').trim();
  const body = String(input.body || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90 || !title || title.length > 120 || !category || category.length > 60 || !description || description.length > 180 || !body || body.length > 40000) {
    return json({ error: 'Check the slug, title, category, excerpt and article length.' }, 400);
  }
  const sections = parseBody(body);
  if (!sections.length || sections.some(({ heading, paragraphs }) => !heading || !paragraphs.length)) return json({ error: 'Add article text and at least one section heading.' }, 400);
  const contentPath = 'content/blog-posts.json';
  const api = `https://api.github.com/repos/${repository}/contents/${contentPath}`;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };

  try {
    const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers, cache: 'no-store' });
    let posts = [];
    let sha;
    if (existing.ok) {
      const file = await existing.json();
      sha = file.sha;
      posts = JSON.parse(Buffer.from(String(file.content || '').replace(/\s/g, ''), 'base64').toString('utf8'));
      if (!Array.isArray(posts)) throw new Error('The journal content file must contain an array.');
    } else if (existing.status !== 404) {
      return json({ error: `Could not read the connected repository (GitHub returned ${existing.status}).` }, 502);
    }
    const post = { slug, title, category, description, sections, link: { href: '../audit.html', label: 'Talk with Zanove about this' } };
    const index = posts.findIndex((entry) => entry.slug === slug);
    if (index >= 0) posts[index] = post;
    else posts.unshift(post);
    const response = await fetch(api, {
      method: 'PUT', headers,
      body: JSON.stringify({ message: `${index >= 0 ? 'Update' : 'Publish'} journal post: ${title}`, content: Buffer.from(`${JSON.stringify(posts, null, 2)}\n`).toString('base64'), ...(sha ? { sha } : {}), branch }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      return json({ error: `GitHub could not save this article${details.message ? `: ${details.message}` : '.'}` }, 502);
    }
    return json({ ok: true, action: index >= 0 ? 'updated' : 'created' });
  } catch (error) {
    console.error('Blog publish failed:', error.message);
    return json({ error: 'The article could not be saved. Check the publishing setup and try again.' }, 502);
  }
}
