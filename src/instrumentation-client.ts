import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sentry 8's names (vercel-production, vercel-preview); 11 drops the prefix, which
  // would move events away from existing alerts and saved searches.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV
    ? `vercel-${process.env.NEXT_PUBLIC_VERCEL_ENV}`
    : process.env.NODE_ENV,
  // Sentry 11 collects users' IP addresses by default; 8 didn't.
  dataCollection: { userInfo: false },
  // Replay may only be enabled for the client-side
  integrations: [Sentry.replayIntegration()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});

// Traces App Router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
