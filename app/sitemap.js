import posts from '../content/blog-posts.json';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanovetech.vercel.app').replace(/\/$/, '');
const corePages = [
  '/', '/service.html', '/about.html', '/projects.html', '/audit.html', '/project.html', '/privacy.html',
  '/blog', '/ebook.html', '/ask-ai.html',
];
const articles = posts.map(({ slug, dateModified, datePublished }) => ({ path: `/blog/${slug}`, lastModified: dateModified || datePublished || undefined }));

export default function sitemap() {
  return [
    ...corePages.map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: path === '/blog' ? 'monthly' : 'weekly',
      priority: path === '/' ? 1 : path === '/blog' ? 0.8 : 0.7,
    })),
    ...articles.map(({ path, lastModified }) => ({
      url: `${siteUrl}${path}`,
      ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
      changeFrequency: 'monthly',
      priority: 0.65,
    })),
  ];
}
