import nodemailer from 'nodemailer';
import { readAuditToken } from '../../../../lib/audit-token.js';
import { allowRequest, clientKey } from '../../../../lib/rate-limit.js';
import { hasSameRequestOrigin } from '../../../../lib/request-origin.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function reportHtml(report, host, name) {
  const categories = report.categories.map((category, index) => `
    <section style="padding:20px 0;border-bottom:1px solid #d9dfda">
      <h2 style="font:600 20px Arial,sans-serif;color:#061322;margin:0 0 8px">${index + 1}. ${escapeHtml(category.title)} <span style="font:600 12px Arial,sans-serif;color:#18D7CE">${escapeHtml(category.status)}</span></h2>
      <p style="font:15px/1.6 Arial,sans-serif;color:#4e5a55">${escapeHtml(category.overview)}</p>
      <ul style="padding-left:20px">${category.findings.map((finding) => `<li style="margin:12px 0;font:14px/1.6 Arial,sans-serif;color:#101728"><strong>${escapeHtml(finding.title)}</strong> — ${escapeHtml(finding.detail)}<br><strong>What to do:</strong> ${escapeHtml(finding.action)}</li>`).join('')}</ul>
    </section>`).join('');
  return `<div style="max-width:720px;margin:auto;font-family:Arial,sans-serif;color:#101728"><div style="padding:24px;background:#061322;color:#F8F8F8"><p style="margin:0 0 6px;color:#18D7CE;font-weight:bold;letter-spacing:2px">ZANOVE TECHNOLOGIES</p><h1 style="margin:0;font-size:28px">Your Website Growth Audit</h1><p style="margin:8px 0 0;color:#F8F8F8">${escapeHtml(host)}</p></div><div style="padding:22px"><p>Hello${name ? ` ${escapeHtml(name)}` : ''},</p><p>${escapeHtml(report.summary)}</p><p><strong>Overall: ${escapeHtml(report.overall_status)}</strong></p>${categories}<section style="margin-top:24px;padding:22px;background:#f2f6f5;border-left:4px solid #18D7CE"><h2 style="margin:0 0 8px;color:#061322;font-size:20px">Let’s solve the problem this audit found.</h2><p style="line-height:1.6">Want help turning these findings into action? Reply to this email or contact Zanove to arrange a strategy call.</p><p style="margin:16px 0"><a href="mailto:zanovetechnologies@gmail.com?subject=Book%20a%20website%20strategy%20call" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#18D7CE;color:#061322;font-weight:bold;text-decoration:none">Book a call with Zanove</a></p><p style="margin:0">zanovetechnologies@gmail.com</p></section><p style="font-size:12px;line-height:1.5;color:#66716b">This is a first-pass review of publicly available website information, using measured page checks and AI-assisted analysis where available. It is not a security scan or a substitute for a hands-on technical audit.</p></div></div>`;
}

export async function POST(request) {
  if (!hasSameRequestOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const gmailUser = 'zanovetechnologies@gmail.com';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (!gmailAppPassword) {
    return Response.json({ error: 'Email delivery is not configured yet. Add the Gmail App Password to the server environment.' }, { status: 503 });
  }
  if (!allowRequest(`email:${clientKey(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return Response.json({ error: 'This browser session has reached its hourly email limit. Please try again later.' }, { status: 429 });
  }

  let body;
  let audit;
  try {
    if (Number(request.headers.get('content-length') || 0) > 40000) throw new Error('Request is too large.');
    body = await request.json();
    if (body.consent !== true) throw new Error('Please agree to receive the report and let Zanove follow up.');
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length > 100) throw new Error('Name must be 100 characters or fewer.');
    if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      throw new Error('Enter a valid email address.');
    }
    audit = readAuditToken(body.auditToken);
    body.name = name;
    body.email = body.email.trim().toLowerCase();
  } catch (error) {
    return Response.json({ error: error.message || 'We could not verify this audit.' }, { status: 400 });
  }

  const from = `Zanove Technologies <${gmailUser}>`;
  const html = reportHtml(audit.report, audit.host, body.name);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const deliveries = await Promise.allSettled([
    transporter.sendMail({
      from,
      to: body.email,
      replyTo: gmailUser,
      subject: `Your Zanove website audit: ${audit.host}`,
      html,
      text: `Hello${body.name ? ` ${body.name}` : ''},\n\n${audit.report.summary}\n\nOverall: ${audit.report.overall_status}\n\nYour complete audit report is included in this email.\n\nWant help putting the findings into action? Reply to this email or contact zanovetechnologies@gmail.com to book a strategy call.`,
    }),
    transporter.sendMail({
      from,
      to: gmailUser,
      replyTo: body.email,
      subject: `New website audit lead: ${audit.host}`,
      html: `<div style="font-family:Arial,sans-serif;color:#101728"><h1>New website audit request</h1><p><strong>Name:</strong> ${escapeHtml(body.name || 'Not provided')}</p><p><strong>Email:</strong> ${escapeHtml(body.email)}</p><p><strong>Website:</strong> <a href="${escapeHtml(audit.url)}">${escapeHtml(audit.url)}</a></p><p><strong>Consent:</strong> Report delivery and Zanove follow-up accepted.</p><hr>${html}</div>`,
      text: `New website audit request\nName: ${body.name || 'Not provided'}\nEmail: ${body.email}\nWebsite: ${audit.url}\nConsent: Report delivery and Zanove follow-up accepted.\n\n${audit.report.summary}`,
    }),
  ]);
  await transporter.close();
  const outcomes = deliveries.map((delivery) => delivery.status === 'fulfilled');
  deliveries.forEach((delivery) => {
    if (delivery.status === 'rejected') console.error('Gmail SMTP delivery failed', delivery.reason?.code || delivery.reason?.name || '');
  });
  const [customerSent, zanoveNotified] = outcomes;
  if (!customerSent || !zanoveNotified) {
    return Response.json({ customerSent, zanoveNotified, error: 'The report is ready, but one or more emails could not be delivered. You can still read the report here.' }, { status: 502 });
  }
  return Response.json({ customerSent: true, zanoveNotified: true }, { headers: { 'Cache-Control': 'no-store' } });
}
