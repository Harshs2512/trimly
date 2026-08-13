/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/register',
        destination: '/login',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
