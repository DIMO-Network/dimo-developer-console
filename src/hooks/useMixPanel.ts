import mixpanel from 'mixpanel-browser';

export const useMixPanel = () => {
  const vercelEnv = process.env.VERCEL_ENV;

  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (vercelEnv === 'development') return;
    mixpanel.track(eventName, properties);
  };
  const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
    if (vercelEnv === 'development') return;
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
    }
  };

  const initMixPanel = () => {
    if (vercelEnv === 'development') return;

    const mixPanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (!mixPanelToken!) {
      console.error('Mixpanel token is not defined');
      return;
    }

    mixpanel.init(mixPanelToken!, {
      persistence: 'localStorage',
      debug: false,
      ignore_dnt: true,
      autocapture: true,
    });
  };

  return {
    initMixPanel,
    trackEvent,
    identifyUser,
  };
};
