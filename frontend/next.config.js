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
}

module.exports = nextConfig

