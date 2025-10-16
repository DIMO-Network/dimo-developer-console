import { Metadata } from 'next';

import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

const LIWDConfiguratorPage = View;
export default LIWDConfiguratorPage;
