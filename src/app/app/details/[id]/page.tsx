import { Metadata } from 'next';

import { View } from '@/app/app/details/[id]/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Application Detail | ${configuration.appName}`,
};

const AppDetailPage = View;

export default AppDetailPage;
