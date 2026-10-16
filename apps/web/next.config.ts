import type { NextConfig } from 'next'

const apiUrl = process.env.API_URL ?? 'http://localhost:8787'

const nextConfig: NextConfig = {
  transpilePackages: ['@app/shared', '@app/ui'],
  // 浏览器统一请求同源 /api/*，由 Next 转发到 apps/api，避免 CORS
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]
  },
}

export default nextConfig
