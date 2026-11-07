import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from '@/app/license/[tokenId]/details/components/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('license');
  return { title: t('details.metadataTitle', { appName: configuration.appName }) };
};

const LicenseDetailsPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <View params={params} />
);
export default LicenseDetailsPage;
