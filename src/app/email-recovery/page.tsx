import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from '@/app/email-recovery/components/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('email-recovery');
  return {
    title: t('metadataTitle', { appName: configuration.appName }),
    description: t('metadataDescription'),
  };
};

const EmailRecovery = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default EmailRecovery;
