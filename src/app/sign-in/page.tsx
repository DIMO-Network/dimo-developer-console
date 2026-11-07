import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from '@/app/sign-in/components/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('sign-in');
  return {
    title: t('metadataTitle', { appName: configuration.appName }),
    description: t('metadataDescription'),
  };
};

const SignIn = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default SignIn;
