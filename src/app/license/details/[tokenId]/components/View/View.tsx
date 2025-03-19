'use client';
import {useEffect, useState} from "react";

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const {tokenId: tokenIdParam} = await params;
      setTokenId(tokenIdParam);
    };
    fetchData();
  }, [params]);

  return (
    <p>TODO! - Implement the license details page for license {tokenId}</p>
  );
};

export default View;
