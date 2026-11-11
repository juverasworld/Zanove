# Zanove analytics setup

The site now includes consent-gated Vercel Web Analytics and Speed Insights. No third-party analytics scripts load until a visitor chooses **Accept analytics**. The visitor can reject or reopen preferences from the footer. Event payloads intentionally exclude form values, email addresses, audit URLs and AI chat text.

## Turn on collection in Vercel

1. Open the Zanove project in the Vercel dashboard.
2. Open **Analytics** and enable **Web Analytics**.
3. Open **Speed Insights** and enable it too.
4. Redeploy the latest commit. Vercel provides the `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` endpoints after these products are enabled.
5. In a clean browser, confirm the consent choice appears. Reject and verify the scripts are absent in DevTools Network. Then accept and verify page views and performance data appear in the Vercel dashboard.

Vercel Web Analytics and Speed Insights availability depends on the project and plan. The base Web Analytics dashboard provides page-level traffic; custom event reporting is available on Pro and Enterprise plans. If the project stays on Hobby, the site still emits the defined event calls after consent, but the dashboard may not expose those event reports.

## Events in the code

- `website_audit_started`, `website_audit_completed`, `website_audit_failed`
- `full_audit_report_requested`, `full_audit_report_sent`
- `consultation_form_opened`, `consultation_request_sent`
- `ask_ai_opened`, `ask_ai_prompt_selected`, `ask_ai_question_sent`, `ask_ai_handoff_sent`
- `whatsapp_link_clicked`, `email_link_clicked`, `outbound_link_clicked`, `internal_link_clicked`
- `project_filter_selected`, `navigation_menu_opened`, `scroll_depth`
- `engaged_time_milestone` at 30 seconds, 1, 3, 5 and 10 minutes of visible-page time

There is no session replay, heatmap, fingerprinting SDK or advertising tag. Consent and disclosure are implemented for these analytics scripts, but this document is not a legal compliance review or a substitute for a complete privacy notice.
