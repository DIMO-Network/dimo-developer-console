import React from 'react';
import { View } from './components/View';

// The page is a client shell with no server data. Rendering each path once and
// serving it from cache spares a function invocation (and its cold start) on
// every visit; the middleware still checks the session first.
export const generateStaticParams = async () => [];

export default function ConnectionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <View params={params} />;
}
