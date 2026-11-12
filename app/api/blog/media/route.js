import { randomUUID } from 'node:crypto';
import { checkBlogRequestAuthorization } from '../../../../lib/blog-request-auth.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
const formats = {
  'image/jpeg': { extension: 'jpg', signature: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', signature: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/webp': { extension: 'webp', signature: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' },
  'image/gif': { extension: 'gif', signature: (bytes) => ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)) },
};

export async function POST(request) {
  const authorizationError = checkBlogRequestAuthorization(request);
  if (authorizationError) return json({ error: authorizationError.error }, authorizationError.status);
  const repository = process.env.GITHUB_REPOSITORY || 'juverasworld/Zanove';
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !/^[^/]+\/[^/]+$/.test(repository)) return json({ error: 'Image uploads need a server-side GitHub token configured.' }, 503);

  let input;
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 3_600_000) return json({ error: 'Choose an image smaller than 2.5 MB.' }, 413);
    input = await request.json();
  } catch { return json({ error: 'The image upload request could not be read.' }, 400); }

  const type = String(input.type || '').toLowerCase();
  const format = formats[type];
  const encoded = String(input.base64 || '');
  if (!format || !encoded || encoded.length > 3_500_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return json({ error: 'Use a JPEG, PNG, WebP or GIF image smaller than 2.5 MB.' }, 400);
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 2_500_000 || !format.signature(bytes)) return json({ error: 'The file contents do not match a supported image format.' }, 400);

  const rawSlug = String(input.slug || 'zanove').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'zanove';
  const rawName = String(input.name || 'image').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'image';
  const purpose = input.purpose === 'profile' ? 'profile' : input.purpose === 'cover' ? 'cover' : 'inline';
  const filename = `${rawSlug}-${purpose}-${rawName}-${randomUUID().slice(0, 8)}.${format.extension}`;
  const contentPath = `public/assets/blog/${filename}`;
  const apiPath = contentPath.split('/').map(encodeURIComponent).join('/');
  const api = `https://api.github.com/repos/${repository}/contents/${apiPath}`;
  const response = await fetch(api, {
    method: 'PUT',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Add journal ${purpose} image: ${filename}`, content: bytes.toString('base64'), branch }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    console.error('Blog image upload failed:', response.status, details.message || 'GitHub rejected the request.');
    return json({ error: 'GitHub could not store the image. Check repository access and try again.' }, 502);
  }
  return json({ ok: true, url: `/assets/blog/${filename}`, filename });
}
