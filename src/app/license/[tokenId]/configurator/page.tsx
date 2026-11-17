import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ListView } from './components/ListView';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('configurator');
  return { title: t('metadata.listTitle', { appName: configuration.appName }) };
};

const ConfiguratorListPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <ListView params={params} />
);
export default ConfiguratorListPage;
