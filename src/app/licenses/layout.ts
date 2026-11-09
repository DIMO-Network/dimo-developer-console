import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import configuration from '@/config';
import { AuthorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('licenses');
  return { title: t('metadataTitle', { appName: configuration.appName }) };
};

export default AuthorizedRouteLayout;
