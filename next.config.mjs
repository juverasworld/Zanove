const nextConfig = {
  turbopack: { root: process.cwd() },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/blog.html', destination: '/blog', permanent: true },
      { source: '/blog/:slug.html', destination: '/blog/:slug', permanent: true },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/index.html' }] };
  },
};

export default nextConfig;
