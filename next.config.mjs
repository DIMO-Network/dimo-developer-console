import { withSentryConfig } from '@sentry/nextjs';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://crypto-js.stripe.com https://js.stripe.com https://r.stripe.com https://static.cloudflareinsights.com https://vercel.live;
    style-src 'self' 'unsafe-inline';
    object-src 'none';
    base-uri 'self';
    connect-src 'self' https://*.dimo.org https://*.dimo.zone https://crypto-js.stripe.com https://js.stripe.com  https://r.stripe.com https://api.stripe.com https://api.turnkey.com https://explorer-api.walletconnect.com https://*.sentry.io https://polygon-mainnet.g.alchemy.com https://polygon-amoy.g.alchemy.com https://pulse.walletconnect.org https://rpc.zerodev.app https://*.vercel.app https://vercel.live;
    font-src 'self';
    frame-src 'self' https://auth.turnkey.com https://crypto-js.stripe.com https://js.stripe.com https://vercel.live https://r.stripe.com;
    img-src 'self' https://explorer-api.walletconnect.com;
    manifest-src 'self';
    media-src 'self';
    worker-src blob:;`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    VERCEL_ENV: process.env.VERCEL_ENV,
    JWT_KEY_SET_URL: process.env.JWT_KEY_SET_URL,
    JWT_ISSUER: process.env.JWT_ISSUER,
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
    if (process.env.VERCEL_ENV === 'development') {
      return [];
    }
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
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: false, // Can be used to suppress logs
});
