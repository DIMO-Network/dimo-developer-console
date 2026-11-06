import { Metadata } from 'next';
import configuration from '@/config';
import { View } from './components/View';

export const metadata: Metadata = {
  title: `Edit webhook | ${configuration.appName}`,
};

const EditWebhookPage = ({
  params,
}: {
  params: Promise<{ clientId: string; webhookId: string }>;
}) => <View params={params} />;

export default EditWebhookPage;
