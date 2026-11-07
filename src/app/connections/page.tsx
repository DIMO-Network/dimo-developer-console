import { Suspense, type FC } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from './components/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('connections');
  return { title: t('metadata.list', { appName: configuration.appName }) };
};

const ConnectionsPage: FC = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default ConnectionsPage;
