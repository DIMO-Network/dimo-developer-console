import mixpanel from 'mixpanel-browser';

export const initMixPanel = () => {
  const mixPanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  const vercelEnv = process.env.VERCEL_ENV;

  if (!mixPanelToken!) {
    console.error('Mixpanel token is not defined');
    return;
  }

  mixpanel.init(mixPanelToken!, {
    persistence: 'localStorage',
    debug: vercelEnv === 'development',
    ignore_dnt: true,
    autocapture: true,
  });
};
