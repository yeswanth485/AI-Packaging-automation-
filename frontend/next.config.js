/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
    dirs: [], // Completely disable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Use trailing slashes for better static hosting
  trailingSlash: true,
}

module.exports = nextConfig

