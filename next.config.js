/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'models.readyplayer.me' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Next.js 16: Turbopack is default. Empty turbopack config silences webpack warning.
  turbopack: {},
};

module.exports = nextConfig;


