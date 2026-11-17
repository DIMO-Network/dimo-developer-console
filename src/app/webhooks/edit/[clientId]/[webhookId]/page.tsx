import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import configuration from '@/config';
import { View } from './components/View';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('webhooks');
  return { title: t('metadata.edit', { appName: configuration.appName }) };
};

const EditWebhookPage = ({
  params,
}: {
  params: Promise<{ clientId: string; webhookId: string }>;
}) => <View params={params} />;

export default EditWebhookPage;
