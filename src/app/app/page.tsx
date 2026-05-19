import { FC, Suspense } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { View as AppListPage } from '@/app/app/list/components/View';

export const metadata: Metadata = {
  title: `Home | ${configuration.appName}`,
};

const HomePage: FC = () => (
  <Suspense>
    <AppListPage />
  </Suspense>
);

export default HomePage;
