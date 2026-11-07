import { FC, Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import configuration from '@/config';

import { View as AppListPage } from '@/app/app/list/components/View';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('app');
  return { title: t('metadata.title', { appName: configuration.appName }) };
};

const HomePage: FC = () => (
  <Suspense>
    <AppListPage />
  </Suspense>
);

export default HomePage;
