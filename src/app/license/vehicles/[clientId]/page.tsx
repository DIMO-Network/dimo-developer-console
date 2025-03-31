import { Metadata } from 'next';

import { View } from '@/app/license/vehicles/[clientId]/components/View/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Vehicle Details | ${configuration.appName}`,
};

const VehicleDetailsPage = View;
export default VehicleDetailsPage;
