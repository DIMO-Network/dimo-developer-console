import { Metadata } from 'next';

import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Create a Connection | ${configuration.appName}`,
};

const CreateConnectionPage = View;

export default CreateConnectionPage;
