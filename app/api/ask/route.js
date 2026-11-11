import { allowRequest, clientKey } from '../../../lib/rate-limit.js';
import { hasSameRequestOrigin } from '../../../lib/request-origin.js';

export const runtime = 'nodejs';
export const maxDuration = 25;

const SYSTEM_PROMPT = `You are Ask Zanove AI, the helpful website assistant for Zanove Technologies, a digital services company in Nigeria. Zanove works across website and web design, software and digital products, brand design, SEO and content, AI video and image creative, AI workflow automation, and connected business systems. The founder-built project portfolio includes Zanvera Guest Hub (a QR-led AI assistant for independent hotels and rental hosts), No Wahala (a statement-based personal finance dashboard), LegacyMag (premium milestone and memorial booklets), DataWise (Nigerian data bundle comparison and personal tracking), and GlobalPerks (a visual storytelling portfolio). Other selected work includes Hirelyze AI, Kudiplan, My Family Companion, NLBCS and NLEDC. Do not invent project outcomes, client claims, prices, timelines, guarantees, contact phone numbers, or specific technical capabilities that are not supplied here. If asked for current pricing, delivery estimates, or details you cannot verify, say you do not have that information and offer to pass the question to the Zanove team. You can help users clarify their goal, explain general digital concepts, compare reasonable approaches, and give a practical step-by-step starting point. Ask one brief follow-up question when the user’s goal is unclear. Keep answers direct, useful and concise; avoid boilerplate. Never request passwords, payment data, private customer records, health information or other sensitive data. If the user’s question is outside your reliable knowledge, needs a human decision, or you cannot provide a confident helpful answer, respond with exactly [[HANDOFF]] and no other text. Do not pretend to have contacted the team. For a human conversation, users can use the “Send to Zanove” option in this chat or email zanovetechnologies@gmail.com. The free website audit is available at /audit.html.`;

const HANDOFF_ANSWER = 'I don’t have a reliable answer for that yet. I can pass your question to the Zanove team. Add your email if you’d like them to reply.';

export async function POST(request) {
  if (!hasSameRequestOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!process.env.GROQ_API_KEY) return Response.json({ answer: HANDOFF_ANSWER, needsHuman: true }, { headers: { 'Cache-Control': 'no-store' } });
  if (!allowRequest(`ask-ai:${clientKey(request)}`, { limit: 20, windowMs: 60 * 60 * 1000 })) {
    return Response.json({ error: 'This browser session has reached its hourly message limit. Please try again later.' }, { status: 429 });
  }

  let messages;
  try {
    if (Number(request.headers.get('content-length') || 0) > 12000) throw new Error('That message is too long. Please shorten it and try again.');
    const body = await request.json();
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 8) throw new Error('Start a new chat and send a shorter conversation.');
    messages = body.messages.map((message) => {
      if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 1400) {
        throw new Error('A message was empty or too long. Please try again.');
      }
      return { role: message.role, content: message.content.trim() };
    });
    if (messages.at(-1)?.role !== 'user') throw new Error('Send a question to continue.');
    if (messages.reduce((sum, message) => sum + message.content.length, 0) > 7000) throw new Error('This conversation is too long. Start a new chat to continue.');
  } catch (error) {
    return Response.json({ error: error.message || 'Send a valid question to continue.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_completion_tokens: 700,
        temperature: 0.4,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Groq chat error', response.status, payload?.error?.message || '');
      return Response.json({ answer: HANDOFF_ANSWER, needsHuman: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 6000 || answer.includes('[[HANDOFF]]')) {
      return Response.json({ answer: HANDOFF_ANSWER, needsHuman: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ answer: answer.trim(), needsHuman: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Groq chat unavailable', error.name === 'AbortError' ? 'timed out' : error.message);
    return Response.json({ answer: HANDOFF_ANSWER, needsHuman: true }, { headers: { 'Cache-Control': 'no-store' } });
  } finally {
    clearTimeout(timer);
  }
}
