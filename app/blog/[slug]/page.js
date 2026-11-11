import { notFound } from 'next/navigation';
import posts from '../../../content/blog-posts.json';

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');
export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map(({ slug }) => ({ slug }));
}

function articleBySlug(slug) {
  return posts.find((post) => post.slug === slug);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = articleBySlug(slug);
  if (!post) return { title: 'Article not found | Zanove Journal', robots: { index: false, follow: true } };
  const canonical = `${site}/blog/${post.slug}`;
  const title = `${post.title} | Zanove Journal`;
  return {
    title,
    description: post.description,
    alternates: { canonical },
    openGraph: { title, description: post.description, url: canonical, type: 'article', siteName: 'Zanove Technologies', images: [`${site}/assets/zanove-social.jpg`] },
    twitter: { card: 'summary_large_image', title, description: post.description, images: [`${site}/assets/zanove-social.jpg`] },
  };
}

function InlineText({ text }) {
  const chunks = [];
  const matcher = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match;
  while ((match = matcher.exec(text))) {
    if (match.index > last) chunks.push(text.slice(last, match.index));
    const href = match[2].trim();
    const safe = href.startsWith('/') && !href.startsWith('//') || /^https:\/\//i.test(href) || /^mailto:/i.test(href);
    if (safe) chunks.push(<a href={href} key={`${match.index}-${href}`}>{match[1]}</a>);
    else chunks.push(match[1]);
    last = matcher.lastIndex;
  }
  if (last < text.length) chunks.push(text.slice(last));
  return chunks;
}

function ArticleDate({ value, label }) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return <span>{label} <time dateTime={date.toISOString()}>{date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time></span>;
}

export default async function JournalArticlePage({ params }) {
  const { slug } = await params;
  const post = articleBySlug(slug);
  if (!post) notFound();
  const canonical = `${site}/blog/${post.slug}`;
  const related = posts.filter((item) => item.slug !== post.slug).slice(0, 2);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    headline: post.title,
    description: post.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical,
    articleSection: post.category,
    ...(post.datePublished ? { datePublished: post.datePublished } : {}),
    ...(post.dateModified ? { dateModified: post.dateModified } : {}),
    author: { '@id': `${site}/#organization` },
    publisher: { '@id': `${site}/#organization` },
    isPartOf: { '@type': 'Blog', '@id': `${site}/blog#journal`, name: 'Zanove Journal', url: `${site}/blog` },
  };
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
    { '@type': 'ListItem', position: 2, name: 'Zanove Journal', item: `${site}/blog` },
    { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
  ] };
  return <main>
    <div className="container article-back"><a href="/blog">← All Zanove Journal articles</a></div>
    <section className="page-hero"><div className="container" data-reveal><p className="eyebrow">{post.category || 'Zanove Journal'}</p><h1>{post.title}</h1><p className="lead">{post.description}</p><div className="article-byline"><span>By Zanove Technologies</span><ArticleDate value={post.datePublished} label="· Published" /><ArticleDate value={post.dateModified && post.dateModified !== post.datePublished ? post.dateModified : null} label="· Updated" /></div></div></section>
    <section className="section"><article className="container article-content"><p className="blog-lead">{post.description}</p>
      {(post.sections || []).map((section, sectionIndex) => <section key={`${section.heading}-${sectionIndex}`}><h2>{section.heading}</h2>{(section.paragraphs || []).map((paragraph, paragraphIndex) => <p key={`${sectionIndex}-${paragraphIndex}`}><InlineText text={paragraph} /></p>)}</section>)}
      <div className="article-service-links"><p className="eyebrow">A practical next step</p><h2>Need help applying this to your business?</h2><p>Explore the relevant Zanove service or tell us what you are trying to improve. We can help you choose a clear next step.</p><div className="hero-actions"><a className="button" href="/service.html">Explore our services <span aria-hidden="true">↗</span></a><a className="button button-secondary" href="/project.html">Request a consultation <span aria-hidden="true">↗</span></a></div></div>
    </article></section>
    {related.length > 0 && <section className="section related-journal"><div className="container"><div className="section-heading"><p className="eyebrow">Keep learning</p><h2>More from the Zanove Journal.</h2></div><div className="blog-card-grid">{related.map((item) => <article className="blog-card" key={item.slug}><p className="project-kicker">{item.category || 'Zanove Journal'}</p><h3><a href={`/blog/${item.slug}`}>{item.title}</a></h3><p>{item.description}</p><a className="card-link" href={`/blog/${item.slug}`}>Read the article <span aria-hidden="true">↗</span></a></article>)}</div></div></section>}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll('<', '\\u003c') }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replaceAll('<', '\\u003c') }} />
  </main>;
}
