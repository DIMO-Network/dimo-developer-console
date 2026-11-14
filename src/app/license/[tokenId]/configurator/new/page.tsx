import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { View } from './components/View';
import { OwnerOnly } from '@/components/OwnerOnly';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('configurator');
  return { title: t('metadata.newTitle', { appName: configuration.appName }) };
};

const NewConfiguratorPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <OwnerOnly feature="configurations">
    <View params={params} />
  </OwnerOnly>
);
export default NewConfiguratorPage;
