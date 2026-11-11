export function hasSameRequestOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  let originHost;
  try {
    originHost = new URL(origin).host.toLowerCase().replace(/\.$/, '');
  } catch {
    return false;
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const requestHost = (forwardedHost || request.headers.get('host') || new URL(request.url).host)
    .toLowerCase().replace(/\.$/, '');
  return originHost === requestHost;
}
