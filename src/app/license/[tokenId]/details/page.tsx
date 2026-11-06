import { Metadata } from 'next';

import { View } from '@/app/license/[tokenId]/details/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `License Details | ${configuration.appName}`,
};

const LicenseDetailsPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <View params={params} />
);
export default LicenseDetailsPage;
