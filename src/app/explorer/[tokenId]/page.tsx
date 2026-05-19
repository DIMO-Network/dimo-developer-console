'use client';

import { use } from 'react';
import { ExplorerView } from '../components/ExplorerView';

export default function ExplorerTokenPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  return <ExplorerView initialTokenId={Number(tokenId)} />;
}
