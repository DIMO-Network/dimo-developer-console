import { withSentryConfig } from '@sentry/nextjs';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' sentry.io cloudflareinsights.com vercel.live;
    frame-src 'self' *.turnkey.com;
    connect-src 'self' sentry.io cloudflareinsights.com;
    img-src 'self' data:;
    style-src 'self' 'unsafe-inline' cloudflareinsights.com;
    font-src 'self' cloudflareinsights.com;
    object-src 'none';`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'dimo-hp',
  project: 'developer-console',

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: false, // Can be used to suppress logs
});
