import { Metadata } from 'next';

import { View } from '@/app/license/vehicles/[clientId]/components/View/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Licensed vehicles | ${configuration.appName}`,
};

const VehicleDetailsPage = ({ params }: { params: Promise<{ clientId: string }> }) => (
  <View params={params} />
);
export default VehicleDetailsPage;
