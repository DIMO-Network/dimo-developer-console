import { Metadata } from 'next';

import { View } from '@/app/license/details/[tokenId]/vehicles/components/View/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Vehicle Details | ${configuration.appName}`,
};

const VehicleDetailsPage = View;
export default VehicleDetailsPage;
