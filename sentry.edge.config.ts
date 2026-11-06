import * as Sentry from '@sentry/nextjs';
import { scrubEmailsDeep, scrubSpan } from '@/utils/sentryScrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sentry 8's names (vercel-production, vercel-preview); 11 drops the prefix, which
  // would move events away from existing alerts and saved searches.
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.VERCEL_ENV ? `vercel-${process.env.VERCEL_ENV}` : process.env.NODE_ENV),

  // Sentry 11 collects users' IP addresses by default; 8 didn't.
  dataCollection: { userInfo: false },
  // No user's email in an event or a span: see sentryScrub. The proxy looks
  // accounts up by email.
  beforeSend: (event) => scrubEmailsDeep(event),
  beforeSendSpan: scrubSpan,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
