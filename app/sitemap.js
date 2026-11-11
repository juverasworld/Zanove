import posts from '../content/blog-posts.json';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanove-technologies.vercel.app').replace(/\/$/, '');
const corePages = [
  '/', '/service.html', '/about.html', '/projects.html', '/audit.html', '/project.html',
  '/blog.html', '/ebook.html', '/ask-ai.html',
];
const articles = posts.map(({ slug }) => `/blog/${slug}.html`);

export default function sitemap() {
  return [...corePages, ...articles].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path.startsWith('/blog') ? 'monthly' : 'weekly',
    priority: path === '/' ? 1 : path.startsWith('/blog/') ? 0.65 : 0.8,
  }));
}
