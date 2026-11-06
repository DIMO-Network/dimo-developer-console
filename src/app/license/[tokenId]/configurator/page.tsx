import { Metadata } from 'next';
import { ListView } from './components/ListView';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `SDK configurator | ${configuration.appName}`,
};

const ConfiguratorListPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <ListView params={params} />
);
export default ConfiguratorListPage;
