import { Metadata } from 'next';

import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Create a Webhook | ${configuration.appName}`,
};

const CreateWebhookPage = View;
export default CreateWebhookPage;
