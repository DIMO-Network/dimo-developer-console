import * as Sentry from '@sentry/nextjs';
import { fingerprintUpstreamError } from '@/utils/sentryFingerprint';
import { dropRequestPayload, scrubEmailsDeep, scrubSpan } from '@/utils/sentryScrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sentry 8's names (vercel-production, vercel-preview); 11 drops the prefix, which
  // would move events away from existing alerts and saved searches.
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.VERCEL_ENV ? `vercel-${process.env.VERCEL_ENV}` : process.env.NODE_ENV),

  // Sentry 11 collects users' IP addresses, cookies and request bodies by default;
  // 8 didn't. A server action's body is its arguments (private keys, signed
  // challenges, access tokens), read through the same req.on('data') Sentry hooks,
  // so every event captured inside an action would carry them.
  dataCollection: { userInfo: false, cookies: false, httpBodies: [] },

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,

  // One issue per upstream route and status, not per call site; never a request
  // body or cookie, whatever attached it; and no user's email, the route's
  // included (the accounts lookup is by email).
  beforeSend: (event, hint) =>
    scrubEmailsDeep(fingerprintUpstreamError(dropRequestPayload(event), hint)),
  beforeSendSpan: scrubSpan,

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
