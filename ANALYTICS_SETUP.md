# Zanove analytics setup

The marketing website is served mainly as static HTML files from `public`, while Next.js handles the APIs and a small number of routes. The site therefore uses Vercel’s documented HTML script integration rather than placing `<Analytics />` in `app/layout.js`: that layout does not wrap the standalone `.html` pages most visitors use. Vercel Web Analytics and Speed Insights load only after a visitor chooses **Accept analytics**. The visitor can reject or reopen preferences from the footer. Event payloads intentionally exclude form values, email addresses, audit URLs and AI chat text.

## Turn on collection in Vercel

1. Open the Zanove project in the Vercel dashboard.
2. Open **Analytics** and enable **Web Analytics**.
3. Open **Speed Insights** and enable it too.
4. Redeploy the latest commit. Vercel provides the `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` endpoints after these products are enabled.
5. In a clean browser, confirm the consent choice appears. Reject and verify the scripts are absent in DevTools Network. Then accept and verify page views and performance data appear in the Vercel dashboard.

The canonical site origin is `https://zanovetech.vercel.app`. Set `NEXT_PUBLIC_SITE_URL` to this value in the Vercel Production environment before deploying so canonical URLs, the sitemap and robots file use the same host.

## Add Google Analytics 4

The site is configured with Measurement ID `G-WYXN8GWNEY`, Tag Manager container `GTM-55VQNQWP`, and Ahrefs Web Analytics key `CVA7infvQMvCW2YUPGw1CA`. They load only after **Accept analytics**. The direct GA4 tag sends page views and privacy-safe custom events. Tag Manager is available for other consented tags. Do not add another GA4 Google tag for the same Measurement ID in GTM while the direct GA4 tag is active, or page views and events may be counted twice. These identifiers are public configuration, not secrets. Ahrefs Web Analytics measures traffic; keyword rank tracking is a separate Ahrefs tool.

The Search Console verification token is also in the page metadata. Add `https://zanovetech.vercel.app/` as a URL-prefix property in Search Console and complete **Verify**. After the domain is live, submit `https://zanovetech.vercel.app/sitemap.xml`. Verification and submission must still be completed in the Google account; code alone cannot do that.

The Next.js `<Analytics />` component shown in Vercel’s Next quickstart is not used here because the actual marketing pages are standalone `.html` documents, not App Router pages. The official Vercel guide also provides a script-tag integration for standalone HTML.

Vercel Web Analytics and Speed Insights availability depends on the project and plan. The base Web Analytics dashboard provides page-level traffic; custom event reporting is available on Pro and Enterprise plans. If the project stays on Hobby, the site still emits the defined event calls after consent, but the dashboard may not expose those event reports. GA4 event reporting requires a configured Measurement ID and property.

## Events in the code

- `website_audit_started`, `website_audit_completed`, `website_audit_failed`
- `full_audit_report_requested`, `full_audit_report_sent`
- `consultation_form_opened`, `consultation_request_sent`
- `ask_ai_opened`, `ask_ai_prompt_selected`, `ask_ai_question_sent`, `ask_ai_handoff_sent`
- `whatsapp_link_clicked`, `email_link_clicked`, `outbound_link_clicked`, `internal_link_clicked`
- `project_filter_selected`, `navigation_menu_opened`, `scroll_depth`
- `engaged_time_milestone` at 30 seconds, 1, 3, 5 and 10 minutes of visible-page time

There is no session replay, heatmap, fingerprinting SDK or advertising tag. Consent and disclosure are implemented for these analytics scripts, but this document is not a legal compliance review or a substitute for a complete privacy notice.
