import posts from '../../content/blog-posts.json';

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');

export const metadata = {
  title: 'Zanove Journal | Websites, AI & Digital Growth',
  description: 'Practical guides from Zanove Technologies on website design, software, AI, automation and digital growth for Nigerian businesses.',
  alternates: { canonical: `${site}/blog` },
  openGraph: { title: 'Zanove Journal | Websites, AI & Digital Growth', description: 'Practical guides from Zanove Technologies on website design, software, AI, automation and digital growth for Nigerian businesses.', url: `${site}/blog`, type: 'website' },
};

export default function BlogIndexPage() {
  const schema = { '@context': 'https://schema.org', '@type': 'Blog', '@id': `${site}/blog#journal`, name: 'Zanove Journal', url: `${site}/blog`, publisher: { '@id': `${site}/#organization` }, blogPost: posts.map((post) => ({ '@type': 'BlogPosting', headline: post.title, url: `${site}/blog/${post.slug}` })) };
  return <main>
    <section className="page-hero"><div className="container" data-reveal><p className="eyebrow">Zanove Journal</p><h1>Clear thinking for better digital work.</h1><p className="lead">Practical notes on websites, software, AI, automation and digital growth. Useful ideas for Nigerian business owners making their next digital decision.</p><div className="hero-actions"><a className="button" href="/service.html">Explore how Zanove can help <span aria-hidden="true">↗</span></a></div></div></section>
    <section className="section"><div className="container"><div className="section-heading" data-reveal><p className="eyebrow">Latest insights</p><h2>Ideas to put to work.</h2><p>Clear answers, useful context and practical next steps for teams building stronger digital businesses.</p></div>
      {posts.length ? <div className="blog-card-grid">{posts.map((post) => <article className="blog-card" key={post.slug}><p className="project-kicker">{post.category || 'Zanove Journal'}</p><h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2><p>{post.description}</p><a className="card-link" href={`/blog/${post.slug}`}>Read the article <span aria-hidden="true">↗</span></a></article>)}</div> : <div className="blog-card"><h2>New articles are on the way.</h2><p>Come back soon for practical ideas from Zanove Technologies.</p></div>}
    </div></section>
    <section className="section"><div className="container cta-band"><div><p className="eyebrow">Have a question?</p><h2>Turn a useful idea into a practical next step.</h2><p>Talk with Zanove about a website, software, digital product or business workflow.</p></div><a className="button" href="/project.html">Request a consultation <span aria-hidden="true">↗</span></a></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll('<', '\\u003c') }} />
  </main>;
}
