import { Metadata } from 'next';

import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Create a Webhook | ${configuration.appName}`,
};

const CreateWebhookPage = ({ params }: { params: Promise<{ clientId: string }> }) => (
  <View params={params} />
);
export default CreateWebhookPage;
