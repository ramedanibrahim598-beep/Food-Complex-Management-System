/** @type {import('next').NextConfig} */
const backendApiUrl = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8001')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/api/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html; charset=utf-8',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
