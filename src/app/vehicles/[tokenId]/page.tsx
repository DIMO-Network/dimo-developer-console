'use client';
import { Suspense, use } from 'react';
import { Loader } from '@/components/Loader';
import { VehiclePage } from './components/VehiclePage';

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  return (
    <Suspense fallback={<Loader isLoading />}>
      <VehiclePage tokenId={Number(tokenId)} />
    </Suspense>
  );
}
