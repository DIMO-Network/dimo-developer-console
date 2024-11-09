import { FC } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { View as AppListPage } from '@/app/app/list/components/View';

export const metadata: Metadata = {
  title: `Home | ${configuration.appName}`,
};

const HomePage: FC = AppListPage;

export default HomePage;
