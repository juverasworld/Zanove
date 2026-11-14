import { notFound } from 'next/navigation';
import { services, servicePath } from '../../../lib/services.mjs';

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');

export function generateStaticParams() {
  return services.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = services.find((entry) => entry.slug === slug);
  if (!service) return {};
  const canonical = `${site}${servicePath(service.slug)}`;
  return {
    title: service.title,
    description: service.description,
    alternates: { canonical },
    openGraph: { type: 'website', siteName: 'Zanove Technologies', title: service.title, description: service.description, url: canonical, images: [`${site}/assets/zanove-social.jpg`] },
    twitter: { card: 'summary_large_image', title: service.title, description: service.description, images: [`${site}/assets/zanove-social.jpg`] },
  };
}

function ServiceSchema({ service }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${site}${servicePath(service.slug)}#service`,
    name: service.name,
    serviceType: service.serviceType,
    description: service.description,
    url: `${site}${servicePath(service.slug)}`,
    areaServed: { '@type': 'Country', name: 'Nigeria' },
    provider: { '@id': `${site}/#organization` },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll('<', '\\u003c') }} />;
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  const service = services.find((entry) => entry.slug === slug);
  if (!service) notFound();
  const otherServices = services.filter((entry) => entry.slug !== service.slug);
  return <>
    <main>
      <section className="page-hero"><div className="container" data-reveal><p className="eyebrow">{service.keyword}</p><h1>{service.h1}</h1><p className="lead">{service.intro}</p><div className="hero-actions"><a className="button" href="/project.html">{service.cta} <span aria-hidden="true">↗</span></a><a className="button button-secondary" href={service.slug === 'website-agency-in-nigeria' ? '/audit.html' : '/service.html'}>{service.slug === 'website-agency-in-nigeria' ? 'Run a free website audit' : 'Explore everything Zanove does'}</a></div></div></section>
      <section className="section"><div className="container"><div className="section-heading" data-reveal><p className="eyebrow">Start with the business need</p><h2>{service.name} built around the problem to solve.</h2><p>{service.problem}</p></div><div className="service-grid">{service.offer.map(([title, description], index) => <article className="service-card" data-reveal key={title}><span className="card-index">{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
      <section className="section section-dark"><div className="container"><div className="section-heading" data-reveal><p className="eyebrow">How we approach the work</p><h2>Clear steps. A scope you can understand.</h2><p>We agree the right work for your business before delivery begins.</p></div><div className="process-grid">{service.process.map((step, index) => <article className="process-card" data-reveal key={step}><span className="card-index">STEP {index + 1}</span><h3>{['Understand', 'Plan', 'Build', 'Review'][index]}</h3><p>{step}</p></article>)}</div></div></section>
      <section className="section"><div className="container faq-layout"><div className="section-heading" data-reveal><p className="eyebrow">Is this the right next step?</p><h2>Who this service can help.</h2><p>Every project is different. This service may be a fit if one or more of these challenges sound familiar.</p></div><ul className="service-fit-list">{service.fit.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
      <section className="section section-projects"><div className="container"><div className="section-heading" data-reveal><p className="eyebrow">Selected founder-built work</p><h2>Related work from Zanove.</h2><p>These projects show relevant product and creative experience. They are examples of our work, not promises of a particular client outcome.</p></div><div className="project-grid service-project-grid">{service.projects.map(([name, description, href, image]) => <article className="project-card" data-reveal key={name}><a className="project-visual" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}><img src={image} alt={`${name} project preview`} loading="lazy" /></a><div className="project-body"><p className="project-kicker">Selected work · {service.name}</p><h3>{name}</h3><p>{description}</p><a className="card-link" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>Explore {name} <span aria-hidden="true">↗</span></a></div></article>)}</div></div></section>
      <section className="section"><div className="container faq-layout"><div className="section-heading" data-reveal><p className="eyebrow">Common questions</p><h2>Questions about {service.name.toLowerCase()}.</h2><p>Start a conversation if you want to discuss your specific situation.</p></div><div className="faq-list" data-reveal>{service.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>
      <section className="section related-journal"><div className="container"><div className="section-heading"><p className="eyebrow">More from Zanove</p><h2>Zanove works across connected digital services.</h2><p>Some projects need one capability. Others bring several together around a shared business goal.</p></div><div className="service-grid">{otherServices.map((item) => <article className="service-card" key={item.slug}><p className="project-kicker">{item.keyword}</p><h3>{item.name}</h3><p>{item.description}</p><a className="card-link" href={servicePath(item.slug)}>Explore {item.name} <span aria-hidden="true">↗</span></a></article>)}</div></div></section>
      <section className="section"><div className="container cta-band"><div><p className="eyebrow">Start a conversation</p><h2>Tell us what you want to make better.</h2><p>We’ll talk through your goals and a practical next step. No finished brief is needed.</p></div><a className="button" href="/project.html">{service.cta} <span aria-hidden="true">↗</span></a></div></section>
    </main>
    <ServiceSchema service={service} />
  </>;
}
