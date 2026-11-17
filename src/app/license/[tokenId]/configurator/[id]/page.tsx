import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from './components/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('configurator');
  return { title: t('metadata.editTitle', { appName: configuration.appName }) };
};

const EditLIWDConfiguratorPage = ({
  params,
}: {
  params: Promise<{ tokenId: string; id: string }>;
}) => <View params={params} />;
export default EditLIWDConfiguratorPage;
