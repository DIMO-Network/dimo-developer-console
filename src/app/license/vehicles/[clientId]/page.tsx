import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { View } from '@/app/license/vehicles/[clientId]/components/View/View';
import configuration from '@/config';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('license');
  return { title: t('vehicles.metadataTitle', { appName: configuration.appName }) };
};

const VehicleDetailsPage = ({ params }: { params: Promise<{ clientId: string }> }) => (
  <View params={params} />
);
export default VehicleDetailsPage;
