/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
    dirs: [], // Completely disable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:3000/health',
      },
    ]
  },
}

module.exports = nextConfig

