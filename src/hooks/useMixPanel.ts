import type { OverridedMixpanel } from 'mixpanel-browser';

const noTrackingEnv = ['development', 'preview'];

// mixpanel-browser is about 120 KB gzipped, and the root layout used to load
// it on every page before the page could run. It loads once, after the page,
// the first time something initializes or tracks; calls made before then wait
// for it, in the order they were made.
let loading: Promise<OverridedMixpanel | null> | null = null;

const tracking = () => !noTrackingEnv.includes(process.env.VERCEL_ENV!);

const loadMixpanel = () =>
  (loading ??= import('mixpanel-browser')
    .then(({ default: mixpanel }) => {
      const mixPanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
      if (!mixPanelToken) {
        console.error('Mixpanel token is not defined');
        return null;
      }
      mixpanel.init(mixPanelToken, {
        persistence: 'localStorage',
        debug: false,
        ignore_dnt: true,
        autocapture: false,
      });
      return mixpanel;
    })
    // Analytics never breaks the page: a failed load just stops tracking.
    .catch(() => null));

const withMixpanel = (use: (mixpanel: OverridedMixpanel) => void) => {
  if (!tracking()) return;
  void loadMixpanel().then((mixpanel) => mixpanel && use(mixpanel));
};

export const useMixPanel = () => {
  const trackEvent = (eventName: string, properties?: Record<string, unknown>) =>
    withMixpanel((mixpanel) => mixpanel.track(eventName, properties));

  const identifyUser = (userId: string, properties?: Record<string, unknown>) =>
    withMixpanel((mixpanel) => {
      mixpanel.identify(userId);
      if (properties) mixpanel.people.set(properties);
    });

  const initMixPanel = () => withMixpanel(() => {});

  return {
    initMixPanel,
    trackEvent,
    identifyUser,
  };
};
