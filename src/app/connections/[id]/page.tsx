import React from 'react';
import { View } from './components/View';

export default function ConnectionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <View params={params} />;
}
