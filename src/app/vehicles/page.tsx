import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import configuration from '@/config';
import { VehiclesView } from './components/VehiclesView';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('vehicles');
  return { title: t('list.metadataTitle', { appName: configuration.appName }) };
};

export default function VehiclesPage() {
  // useSearchParams (the ?license= selection) needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <VehiclesView />
    </Suspense>
  );
}
