import { type FC } from 'react';
import { Metadata } from 'next';

import { View } from '@/app/app/list/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Applications | ${configuration.appName}`,
};

export const AppListPage: FC = () => <View />;

export default AppListPage;
