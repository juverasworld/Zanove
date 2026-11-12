import Script from 'next/script';

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');

export const metadata = {
  title: 'Zanove Journal | Websites, AI & Digital Growth',
  description: 'Practical guides from Zanove Technologies on website design, software, AI, automation and digital growth for Nigerian businesses.',
  alternates: { canonical: `${site}/blog` },
  openGraph: {
    type: 'website',
    siteName: 'Zanove Technologies',
    images: [`${site}/assets/zanove-social.jpg`],
  },
};

const pages = [
  ['Home', '/'], ['Services', '/service.html'], ['Projects', '/projects.html'], ['Blog', '/blog'],
  ['Ask our AI', '/ask-ai.html'], ['About', '/about.html'], ['Books', '/ebook.html'],
];

function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    name: 'Zanove Technologies',
    url: `${site}/`,
    logo: `${site}/assets/zanove-logo.png`,
    email: 'zanovetechnologies@gmail.com',
    sameAs: ['https://www.instagram.com/zanovetech/'],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll('<', '\\u003c') }} />;
}

export default function BlogLayout({ children }) {
  return <>
    <link rel="stylesheet" href="/assets/zanove-site.css?v=20261112-blog-editor" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <header className="site-header" data-site-header>
      <nav className="nav-shell" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Zanove Technologies home"><img src="/assets/zanove-logo.png" alt="Zanove Technologies" /></a>
        <ul className="nav-links" id="site-menu" data-site-menu>{pages.map(([label, href]) => <li key={href}><a href={href} aria-current={label === 'Blog' ? 'page' : undefined}>{label}</a></li>)}</ul>
        <a className="nav-cta" href="/project.html">Discuss a project <span aria-hidden="true">↗</span></a>
        <button className="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-menu" aria-label="Open navigation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" /></svg></button>
      </nav>
    </header>
    {children}
    <footer className="site-footer"><div className="container"><div className="footer-main">
      <div className="footer-brand"><a href="/"><img src="/assets/zanove-logo.png" alt="Zanove Technologies" /></a><p>Technology, with purpose. Digital products and connected systems built around business outcomes.</p></div>
      <div><h2 className="footer-title">All pages</h2><nav className="footer-links" aria-label="All pages">{[['Home', '/'], ['Services', '/service.html'], ['About Zanove', '/about.html'], ['Projects', '/projects.html'], ['Website audit', '/audit.html'], ['Request a consultation', '/project.html'], ['Blog', '/blog'], ['Books', '/ebook.html'], ['Ask Zanove AI', '/ask-ai.html'], ['Privacy & analytics', '/privacy.html']].map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav></div>
      <div><h2 className="footer-title">Get in touch</h2><div className="footer-links"><a href="mailto:zanovetechnologies@gmail.com">zanovetechnologies@gmail.com</a><a href="/project.html">Request a project consultation</a><a href="https://wa.me/2349138638126?text=Hi%20Zanove%2C%20I%27d%20like%20to%20discuss%20a%20project." target="_blank" rel="noopener noreferrer">WhatsApp Zanove</a><a href="/privacy.html">Privacy & analytics</a><a href="#analytics-settings" data-analytics-settings>Analytics preferences</a></div></div>
    </div><div className="footer-bottom"><span>© 2026 Zanove Technologies</span><span>Built with purpose.</span></div></div></footer>
    <aside className="ask-widget" data-ask-widget aria-label="Ask Zanove AI">
      <section id="ask-widget-panel" className="ask-widget-panel" data-ask-panel data-ask-chat aria-label="Ask Zanove AI chat" hidden>
        <header className="ask-widget-head"><div className="ask-widget-brand"><span className="ask-widget-avatar" aria-hidden="true">Z</span><div><strong>Ask Zanove AI</strong><span><i aria-hidden="true" /> Here to help</span></div></div><div className="ask-widget-head-actions"><button type="button" className="ask-reset" data-ask-reset aria-label="Start a new chat">Reset</button><button type="button" className="ask-widget-close" data-ask-close aria-label="Close chat">×</button></div></header>
        <p className="ask-widget-intro">Ask about Zanove’s services, projects, website audits, AI and digital growth.</p>
        <div className="ask-messages ask-widget-messages" data-ask-messages role="log" aria-live="polite" aria-relevant="additions text"><div className="ask-message assistant"><span className="ask-avatar" aria-hidden="true">Z</span><p>Hi! I can answer common questions or help you think through a digital challenge. What would you like to know?</p></div></div>
        <div className="ask-widget-prompts" aria-label="Suggested questions"><button type="button" data-ask-prompt="What services does Zanove offer?">Our services</button><button type="button" data-ask-prompt="How does the free website audit work?">Website audit</button><button type="button" data-ask-prompt="How can AI help automate a business workflow?">AI automation</button></div>
        <p className="ask-error" data-ask-error role="alert" hidden />
        <form className="ask-form ask-widget-form" data-ask-form><label className="sr-only" htmlFor="ask-widget-input">Your question</label><textarea id="ask-widget-input" data-ask-input name="question" maxLength={1400} rows={1} placeholder="Type your question…" required /><button className="button" type="submit" data-ask-submit aria-label="Send question">Send <span aria-hidden="true">↗</span></button></form>
        <button className="ask-human-link ask-widget-human-link" type="button" data-ask-human>Send a question to the Zanove team</button>
        <form className="ask-handoff-form ask-widget-handoff" data-ask-handoff-form hidden><p className="eyebrow">Send to Zanove</p><label>Your name <span>(optional)</span><input name="name" maxLength={100} autoComplete="name" placeholder="Your name" /></label><label>Your email <input name="email" type="email" maxLength={254} autoComplete="email" required placeholder="you@company.com" /></label><label>Your question<textarea name="message" maxLength={3000} rows={3} required placeholder="How can the team help?" /></label><small>We’ll send this to zanovetechnologies@gmail.com and reply to your email. Avoid sharing passwords or private customer information.</small><button className="button" type="submit">Send to Zanove</button></form>
        <p className="ask-widget-foot">AI can make mistakes. Don’t share sensitive information. <a href="/ask-ai.html">More about Ask Zanove AI</a></p>
      </section>
      <button className="ask-widget-launcher" type="button" data-ask-launcher aria-expanded="false" aria-controls="ask-widget-panel" aria-label="Open Ask Zanove AI"><span className="ask-widget-launcher-mark" aria-hidden="true">Z</span><span>Ask Zanove AI</span></button>
    </aside>
    <OrganizationSchema />
    <Script src="/assets/zanove-ui.js?v=20261111-blog" strategy="afterInteractive" />
    <Script src="/assets/zanove-ask.js?v=20261111-blog" strategy="afterInteractive" />
    <Script src="/assets/zanove-analytics.js?v=20261111-blog" data-ga-measurement-id="G-WYXN8GWNEY" data-gtm-container-id="GTM-55VQNQWP" data-ahrefs-key="CVA7infvQMvCW2YUPGw1CA" strategy="afterInteractive" />
  </>;
}
