import { Metadata } from 'next';

import configuration from '@/config';
import {View} from '@/app/license/details/[tokenId]/components/View';

export const metaData: Metadata = {
  title: `License Details | ${configuration.appName}`
};

const LicenseDetailsPage = View;
export default LicenseDetailsPage;
