import { createHmac, timingSafeEqual } from 'node:crypto';

function getSecret() {
  return process.env.AUDIT_TOKEN_SECRET || process.env.GROQ_API_KEY;
}

function signature(value) {
  const secret = getSecret();
  if (!secret) throw new Error('Audit token signing is not configured.');
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createAuditToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, issuedAt: Date.now() })).toString('base64url');
  return `${body}.${signature(body)}`;
}

export function readAuditToken(token) {
  if (typeof token !== 'string' || token.length > 30000) throw new Error('This audit has expired. Please run it again.');
  const [body, supplied] = token.split('.');
  if (!body || !supplied) throw new Error('This audit link is invalid. Please run it again.');
  const expected = signature(body);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error('This audit could not be verified. Please run it again.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.issuedAt || Date.now() - payload.issuedAt > 30 * 60 * 1000) throw new Error('This audit has expired. Please run it again.');
  return payload;
}
