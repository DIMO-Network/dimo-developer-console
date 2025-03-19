import { Metadata } from 'next';

import configuration from '@/config';
import {View as LicenseDetailsPage} from '@/app/license/details/[tokenId]/components/View';

export const metaData: Metadata = {
  title: `License Details | ${configuration.appName}`
};


export default LicenseDetailsPage;
