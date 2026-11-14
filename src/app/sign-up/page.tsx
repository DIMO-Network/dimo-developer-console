import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from '@/app/sign-up/components/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('sign-up');
  return {
    title: t('metadataTitle', { appName: configuration.appName }),
    description: t('metadataDescription'),
  };
};

const SignUp = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default SignUp;
