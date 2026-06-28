/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min', '@react-pdf/renderer'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        puppeteer: false,
        fs: false,
        path: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    // For server-side: keep fs/path available for puppeteer runtime,
    // but mark puppeteer as external so it's not bundled
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'puppeteer',
        'puppeteer-core',
        'chrome-aws-lambda',
      ];
    }
    return config;
  },
};
module.exports = nextConfig;