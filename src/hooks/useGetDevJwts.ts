import { useCallback, useEffect, useState } from 'react';
import { getAllDevJwts, StoredJwt } from '@/utils/devJwt';

export const useGetDevJwts = (clientId?: string) => {
  const [devJwts, setDevJwts] = useState<StoredJwt[]>([]);

  const refetch = useCallback(() => {
    if (clientId) {
      const tokens = getAllDevJwts(clientId);
      setDevJwts(tokens);
    } else {
      setDevJwts([]);
    }
  }, [clientId]);

  useEffect(() => {
    refetch();
  }, [clientId, refetch]);

  return {
    devJwts,
    refetch,
    isAuthenticatedAsDev: !!devJwts.length,
  };
};
