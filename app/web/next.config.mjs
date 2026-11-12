/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    TICKET_A_COCINA: process.env.TICKET_A_COCINA || process.env.NEXT_PUBLIC_TICKET_A_COCINA || 'TRUE',
  },
  async redirects() {
    return [
      {
        source: '/inventory',
        destination: '/manager?tab=inventory',
        permanent: false,
      },
      {
        source: '/inventory/:path*',
        destination: '/manager?tab=inventory',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    let rawUrl = (
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://127.0.0.1:3001'
    ).trim();

    // Eliminar comillas accidentales si se pegaron
    rawUrl = rawUrl.replace(/^["']|["']$/g, '');

    // Si falta el protocolo http:// o https://, asegurar https://
    if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('/')) {
      rawUrl = `https://${rawUrl}`;
    }

    const backendUrl = rawUrl.replace(/\/+$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
