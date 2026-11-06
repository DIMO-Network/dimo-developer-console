import { Metadata } from 'next';
import { View } from './components/View';
import { OwnerOnly } from '@/components/OwnerOnly';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `New configuration | ${configuration.appName}`,
};

const NewConfiguratorPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <OwnerOnly feature="Configurations">
    <View params={params} />
  </OwnerOnly>
);
export default NewConfiguratorPage;
