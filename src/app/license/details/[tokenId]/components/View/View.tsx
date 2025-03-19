'use client';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';

import './View.css';

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(tokenIdParam);
    };
    fetchData();
  }, [params]);

  return (
    <div className="license-details-page">
      <div className="summary">
        <BackButton />
      </div>
      <p>TODO - Implement the license details page for license {tokenId}</p>
    </div>
  );
};

export default View;
