import { Metadata } from 'next';

import { View } from '@/app/app/list/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Applications | ${configuration.appName}`,
};

const AppListPage = () => <View />;

export default AppListPage;
