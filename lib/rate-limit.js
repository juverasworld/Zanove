const buckets = new Map();

export function allowRequest(key, { limit, windowMs }) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 2000) {
    for (const [entry, timestamps] of buckets) {
      if (!timestamps.some((time) => now - time < windowMs)) buckets.delete(entry);
    }
  }
  return true;
}

export function clientKey(request) {
  // Prefer the browser session identifier so customers sharing an office, ISP,
  // or serverless proxy do not all consume one network-wide allowance.
  const session = request.headers.get('x-zanove-session') || '';
  if (/^[a-f0-9-]{36}$/i.test(session)) return `session:${session.toLowerCase()}`;

  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  const address = forwarded.split(',')[0].trim();
  return address ? `ip:${address}` : `ua:${request.headers.get('user-agent') || 'unknown'}`;
}
