import nodemailer from 'nodemailer';
import { allowRequest, clientKey } from '../../../../lib/rate-limit.js';
import { hasSameRequestOrigin } from '../../../../lib/request-origin.js';

export const runtime = 'nodejs';
export const maxDuration = 20;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export async function POST(request) {
  if (!hasSameRequestOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!allowRequest(`ask-handoff:${clientKey(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return Response.json({ error: 'This browser session has reached the hourly message limit. Please email zanovetechnologies@gmail.com.' }, { status: 429 });
  }

  let name;
  let email;
  let message;
  try {
    if (Number(request.headers.get('content-length') || 0) > 6000) throw new Error('That message is too long. Please shorten it and try again.');
    const body = await request.json();
    name = typeof body.name === 'string' ? body.name.trim() : '';
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    message = typeof body.message === 'string' ? body.message.trim() : '';
    if (name.length > 100) throw new Error('Name must be 100 characters or fewer.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address so Zanove can reply.');
    if (!message || message.length > 3000) throw new Error('Add a message of up to 3,000 characters.');
  } catch (error) {
    return Response.json({ error: error.message || 'Please check your message and try again.' }, { status: 400 });
  }

  const gmailUser = 'zanovetechnologies@gmail.com';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (!gmailAppPassword) return Response.json({ error: 'The message service is not connected right now. Please email zanovetechnologies@gmail.com directly.' }, { status: 503 });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  try {
    await transporter.sendMail({
      from: `Zanove Website Assistant <${gmailUser}>`,
      to: gmailUser,
      replyTo: email,
      subject: 'New Ask Zanove AI message',
      text: `A visitor asked Ask Zanove AI for help and requested a human response.\n\nName: ${name || 'Not provided'}\nReply email: ${email}\n\nMessage:\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;color:#252a2d;max-width:640px"><h1 style="color:#182522">New Ask Zanove AI message</h1><p>A visitor asked Ask Zanove AI for help and requested a human response.</p><p><strong>Name:</strong> ${escapeHtml(name || 'Not provided')}<br><strong>Reply email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p><h2 style="color:#182522;font-size:18px">Message</h2><p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</p></div>`,
    });
    return Response.json({ sent: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Ask Zanove handoff email failed', error?.code || error?.name || 'unknown');
    return Response.json({ error: 'We could not send your message just now. Please email zanovetechnologies@gmail.com directly.' }, { status: 502 });
  } finally {
    await transporter.close();
  }
}
