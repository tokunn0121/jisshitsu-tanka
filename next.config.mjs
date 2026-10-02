/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async redirects() {
    // 独自ドメインに移ったら、vercel.app からのアクセスを独自ドメインへ301で寄せる
    const canonicalHost = process.env.CANONICAL_HOST;
    const vercelHost = process.env.VERCEL_PROJECT_HOST;
    if (!canonicalHost || !vercelHost) return [];
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: vercelHost }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
