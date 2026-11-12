import { timingSafeEqual } from 'node:crypto';

/** Validate the private admin key and the browser origin behind Vercel proxies. */
export function checkBlogRequestAuthorization(request) {
  const expected = process.env.BLOG_ADMIN_TOKEN || '';
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected) return { status: 503, error: 'Blog publishing is not configured on this deployment.' };
  if (!received) return { status: 401, error: 'Enter your blog admin key and sign in again.' };

  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
    return { status: 401, error: 'The blog admin key was not accepted. Sign in again.' };
  }

  const origin = request.headers.get('origin');
  if (!origin) return null;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = new URL(request.url).host.toLowerCase();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase();
    const hostHeader = request.headers.get('host')?.split(',')[0]?.trim().toLowerCase();
    if (![requestHost, forwardedHost, hostHeader].filter(Boolean).includes(originHost)) {
      return { status: 403, error: 'The upload request came from a different site. Reopen the Zanove admin page and try again.' };
    }
  } catch {
    return { status: 403, error: 'The upload request origin could not be verified. Reopen the Zanove admin page and try again.' };
  }

  return null;
}
