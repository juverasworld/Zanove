const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zanove-technologies.vercel.app').replace(/\/$/, '');

export default function robots() {
  return {
    rules: [
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: ['/admin', '/api/'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/admin', '/api/'] },
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
