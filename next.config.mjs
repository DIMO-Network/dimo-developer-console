import { withSentryConfig } from '@sentry/nextjs';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://crypto-js.stripe.com https://js.stripe.com https://static.cloudflareinsights.com https://vercel.live;
    style-src 'self' 'unsafe-inline';
    object-src 'none';
    base-uri 'self';
    connect-src 'self' https://*.dimo.org https://api.stripe.com https://api.turnkey.com https://explorer-api.walletconnect.com https://*.sentry.io https://polygon-mainnet.g.alchemy.com https://polygon-amoy.g.alchemy.com https://pulse.walletconnect.org https://rpc.zerodev.app;
    font-src 'self';
    frame-src 'self' https://auth.turnkey.com https://crypto-js.stripe.com https://js.stripe.com https://vercel.live;
    img-src 'self' https://explorer-api.walletconnect.com;
    manifest-src 'self';
    media-src 'self';
    worker-src blob:;`;

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
