import mixpanel from 'mixpanel-browser';

const noTrackingEnv = ['development', 'preview'];

export const useMixPanel = () => {
  const vercelEnv = process.env.VERCEL_ENV;

  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (noTrackingEnv.includes(vercelEnv!)) return;
    mixpanel.track(eventName, properties);
  };
  const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
    if (noTrackingEnv.includes(vercelEnv!)) return;
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
    }
  };

  const initMixPanel = () => {
    if (noTrackingEnv.includes(vercelEnv!)) return;

    const mixPanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (!mixPanelToken!) {
      console.error('Mixpanel token is not defined');
      return;
    }

    mixpanel.init(mixPanelToken!, {
      persistence: 'localStorage',
      debug: false,
      ignore_dnt: true,
      autocapture: false,
    });
  };

  return {
    initMixPanel,
    trackEvent,
    identifyUser,
  };
};
