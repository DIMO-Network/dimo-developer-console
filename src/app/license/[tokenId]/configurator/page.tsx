import { Metadata } from 'next';
import { ListView } from './components/ListView';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

const ConfiguratorListPage = ListView;
export default ConfiguratorListPage;
