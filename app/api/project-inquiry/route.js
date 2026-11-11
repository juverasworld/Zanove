import nodemailer from 'nodemailer';
import { allowRequest, clientKey } from '../../../lib/rate-limit.js';
import { hasSameRequestOrigin } from '../../../lib/request-origin.js';

export const runtime = 'nodejs';
export const maxDuration = 25;

const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function POST(request) {
  if (!hasSameRequestOrigin(request)) return reply({ error: 'This request could not be verified. Please refresh the page and try again.' }, 403);
  if (!allowRequest(`project:${clientKey(request)}`, { limit: 8, windowMs: 60 * 60 * 1000 })) {
    return reply({ error: 'You have sent several enquiries recently. Please try again later or contact Zanove on WhatsApp.' }, 429);
  }
  let body;
  try {
    if (Number(request.headers.get('content-length') || 0) > 12000) throw new Error('Your message is too long.');
    body = await request.json();
    if (typeof body.website === 'string' && body.website.trim()) return reply({ ok: true });
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const business = typeof body.business === 'string' ? body.business.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const service = typeof body.service === 'string' ? body.service.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const allowedServices = ['Website or web design', 'Software or digital product', 'AI or workflow automation', 'AI video, image or creative', 'Search, content or digital growth', 'Not sure yet'];
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || business.length > 120 || phone.length > 32 || !allowedServices.includes(service) || !message || message.length > 3000 || body.consent !== true) {
      throw new Error('Please complete the required fields, add a valid email and agree to be contacted.');
    }
    body = { name, business, email, phone, service, message };
  } catch (error) {
    return reply({ error: error.message || 'Please check the enquiry details and try again.' }, 400);
  }

  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (!appPassword) return reply({ error: 'Project email is not configured on this deployment yet. Please contact Zanove on WhatsApp.' }, 503);
  const gmail = 'zanovetechnologies@gmail.com';
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmail, pass: appPassword }, connectionTimeout: 12000, greetingTimeout: 8000, socketTimeout: 16000 });
  const safe = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, escapeHtml(value)]));
  const lead = `<h1>New project consultation request</h1><p><strong>Name:</strong> ${safe.name}</p><p><strong>Business:</strong> ${safe.business || 'Not provided'}</p><p><strong>Email:</strong> ${safe.email}</p><p><strong>WhatsApp:</strong> ${safe.phone || 'Not provided'}</p><p><strong>Interested in:</strong> ${safe.service}</p><p><strong>What they want to improve:</strong></p><p style="white-space:pre-wrap">${safe.message}</p>`;
  try {
    const [team, confirmation] = await Promise.allSettled([
      transporter.sendMail({ from: `Zanove Technologies <${gmail}>`, to: gmail, replyTo: body.email, subject: `Project consultation request: ${body.service}`, html: lead, text: `New project consultation request\nName: ${body.name}\nBusiness: ${body.business || 'Not provided'}\nEmail: ${body.email}\nWhatsApp: ${body.phone || 'Not provided'}\nNeed: ${body.service}\n\n${body.message}` }),
      transporter.sendMail({ from: `Zanove Technologies <${gmail}>`, to: body.email, replyTo: gmail, subject: 'We received your Zanove project enquiry', text: `Hi ${body.name},\n\nThanks for reaching out to Zanove about ${body.service.toLowerCase()}. We’ve received your enquiry and will follow up using the contact details you provided.\n\nIf you’d like to add context sooner, reply to this email or message us on WhatsApp: https://wa.me/2349138638126\n\nZanove Technologies\nzanovetechnologies@gmail.com` }),
    ]);
    await transporter.close();
    if (team.status !== 'fulfilled') {
      console.error('Project enquiry email failed:', team.reason?.code || team.reason?.name || 'unknown');
      return reply({ error: 'We could not send your enquiry right now. Please contact Zanove on WhatsApp or email.' }, 502);
    }
    if (confirmation.status !== 'fulfilled') console.error('Project enquiry confirmation email failed:', confirmation.reason?.code || confirmation.reason?.name || 'unknown');
    return reply({ ok: true, confirmationSent: confirmation.status === 'fulfilled' });
  } catch (error) {
    transporter.close();
    console.error('Project enquiry delivery failed:', error?.code || error?.name || 'unknown');
    return reply({ error: 'We could not send your enquiry right now. Please contact Zanove on WhatsApp or email.' }, 502);
  }
}
