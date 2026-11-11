const nextConfig = {
  turbopack: { root: process.cwd() },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/index.html' }] };
  },
};

export default nextConfig;
