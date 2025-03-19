import { Metadata } from 'next';

import {View} from '@/app/license/details/[tokenId]/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `License Details | ${configuration.appName}`
};

const LicenseDetailsPage = View;
export default LicenseDetailsPage;
