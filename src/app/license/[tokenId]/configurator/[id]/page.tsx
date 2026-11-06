import { Metadata } from 'next';

import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Edit configuration | ${configuration.appName}`,
};

const EditLIWDConfiguratorPage = ({
  params,
}: {
  params: Promise<{ tokenId: string; id: string }>;
}) => <View params={params} />;
export default EditLIWDConfiguratorPage;
