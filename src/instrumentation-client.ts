import * as Sentry from '@sentry/nextjs';
import { scrubEmailsDeep, scrubRecordingEvent, scrubSpan } from '@/utils/sentryScrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sentry 8's names (vercel-production, vercel-preview); 11 drops the prefix, which
  // would move events away from existing alerts and saved searches.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV
    ? `vercel-${process.env.NEXT_PUBLIC_VERCEL_ENV}`
    : process.env.NODE_ENV,
  // Sentry 11 collects users' IP addresses by default; 8 didn't.
  dataCollection: { userInfo: false },
  // No user's email in an event or a span: see sentryScrub.
  beforeSend: (event) => scrubEmailsDeep(event),
  beforeSendSpan: scrubSpan,
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
  // Replay itself loads after the page: see below.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});

// A replay's own event lists the page URLs it covers.
Sentry.addEventProcessor((event) =>
  event.type === 'replay_event' ? scrubEmailsDeep(event) : event,
);

// Replay's recorder is about 38 KB gzipped, and every page loaded it before it
// could run. It loads once the page has loaded and the browser is idle; the
// first moments of a session go unrecorded.
const loadReplay = () =>
  import('@sentry/nextjs')
    .then(({ replayIntegration }) =>
      Sentry.addIntegration(
        replayIntegration({ beforeAddRecordingEvent: scrubRecordingEvent }),
      ),
    )
    // Without Replay the page and the rest of Sentry work as before.
    .catch(() => undefined);

const whenIdle = (run: () => void) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(run, { timeout: 5_000 })
    : setTimeout(run, 2_000);

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') whenIdle(loadReplay);
  else window.addEventListener('load', () => whenIdle(loadReplay), { once: true });
}

// Traces App Router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
