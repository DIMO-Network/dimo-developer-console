import { Metadata } from 'next';

import { View } from '@/app/app/list/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Applications | ${configuration.appName}`,
};

const ApplicationsPage = View;

export default ApplicationsPage;
