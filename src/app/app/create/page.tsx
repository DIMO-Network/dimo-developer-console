import { Metadata } from 'next';

import { View } from '@/app/app/create/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Create an Application | ${configuration.appName}`,
};

const CreateAppPage = View;

export default CreateAppPage;
