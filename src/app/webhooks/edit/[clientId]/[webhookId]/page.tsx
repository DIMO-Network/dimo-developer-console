import { Metadata } from 'next';
import configuration from '@/config';
import { View } from './components/View';

export const metadata: Metadata = {
  title: `Edit webhook | ${configuration.appName}`,
};

const EditWebhookPage = View;

export default EditWebhookPage;
