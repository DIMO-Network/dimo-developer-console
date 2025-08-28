'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyConnections, Connection } from '@/actions/connections';
import { queryClient } from '@/hoc/QueryProvider';

const getQueryKey = () => ['my-connections'];

export const useMyConnections = () => {
  console.log('🔵 useMyConnections hook called');

  const result = useQuery<Connection[]>({
    queryKey: getQueryKey(),
    queryFn: async () => {
      console.log('🔵 useMyConnections queryFn executing');
      try {
        const data = await getMyConnections();
        console.log(
          '✅ useMyConnections queryFn success, got',
          data.length,
          'connections',
        );
        return data;
      } catch (error) {
        console.error('❌ useMyConnections queryFn failed:', error);
        throw error;
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Log the result state
  if (result.error) {
    console.error('❌ useMyConnections React Query error:', result.error);
  }
  if (result.data) {
    console.log(
      '✅ useMyConnections React Query success:',
      result.data.length,
      'connections',
    );
  }

  return result;
};

export const invalidateMyConnectionsQuery = () => {
  return queryClient.invalidateQueries({
    queryKey: getQueryKey(),
    refetchType: 'all',
  });
};
