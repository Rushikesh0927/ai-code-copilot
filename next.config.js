/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: { serverActions: { allowedOrigins: ['ai-code-copilot.onrender.com', 'localhost:3000'] } },
}
module.exports = nextConfig
