import { Suspense } from 'react';
import { Metadata } from 'next';
import configuration from '@/config';
import { VehiclesView } from './components/VehiclesView';

export const metadata: Metadata = { title: `Vehicles | ${configuration.appName}` };

export default function VehiclesPage() {
  // useSearchParams (the ?license= selection) needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <VehiclesView />
    </Suspense>
  );
}
