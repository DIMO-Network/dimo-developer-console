import { withSentryConfig } from '@sentry/nextjs';



// const cspHeader = `
// script-src: 'self' 'unsafe-eval' 'unsafe-inline';
//     style-src: 'self' 'unsafe-inline';
//     img-src 'self' blob: data:;
//     font-src 'self';
//     object-src 'none';
//     base-uri 'self';
//     form-action 'self';
//     frame-ancestors 'none';
//     upgrade-insecure-requests;`;

//const headers = ["default-src 'self';", "script-src 'self' 'unsafe-eval';", "style-src 'self' 'unsafe-inline';", "img-src 'self' data:;"];

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;`;

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
  }
};

export default withSentryConfig(nextConfig, {
  org: 'dimo-hp',
  project: 'developer-console',

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: false, // Can be used to suppress logs
});
