# Zanove website audit setup

The project runs in Next.js. The existing HTML pages and assets are served from `public/` so the established layout stays intact; the audit and email functions run as Next.js Route Handlers.

## Local development

1. Revoke the GroqCloud API key pasted into chat and create a replacement.
2. Copy `.env.example` to `.env.local`, then set `GROQ_API_KEY`, `GMAIL_APP_PASSWORD`, and `AUDIT_TOKEN_SECRET` in that ignored file.
3. For Gmail SMTP, create a dedicated App Password for `zanovetechnologies@gmail.com`. Google requires 2-Step Verification before App Passwords are available. Do not use the account's normal password.
4. Run `npm run dev` and open `http://127.0.0.1:3001`. Do not open the HTML files with `file://`; file previews cannot reach the API routes.

## Deploy

Deploy the Next.js project on a Node.js host such as Vercel. Add `GROQ_API_KEY`, `GMAIL_APP_PASSWORD`, and `AUDIT_TOKEN_SECRET` as server-side environment variables in the host dashboard. Do not enable static export: the audit and email routes require a server runtime.

## Audit and email flow

1. A visitor submits a public website URL. `/api/audit` asks GroqCloud's browser-search model to inspect public pages on that host and returns an audit snapshot plus a signed report token.
2. The report modal shows category statuses and detailed findings. The visitor can enter a name and email and consent to report delivery and a Zanove follow-up.
3. `/api/audit/email` verifies the signed token, emails the full report to the visitor from `zanovetechnologies@gmail.com`, and emails a new-lead notice to the same inbox. Replies to the customer report go to Zanove; replies to the lead notification go to the customer.

The submitted public website URL is sent to GroqCloud for analysis. Gmail sends use Nodemailer over Gmail SMTP. Google can require App Password setup and may block sign-ins from unusual server locations; Nodemailer recommends OAuth 2.0 for more reliable production Gmail integration. Personal Gmail also enforces sending limits. Groq inference and browser search may incur charges.

The handlers apply a per-IP hourly limit in each running instance. Configure host-level abuse controls before promoting the public form widely.
