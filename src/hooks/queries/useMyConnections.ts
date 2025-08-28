'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyConnections, Connection } from '@/actions/connections';
import { queryClient } from '@/hoc/QueryProvider';

const getQueryKey = () => ['my-connections'];

export const useMyConnections = () => {
  return useQuery<Connection[]>({
    queryKey: getQueryKey(),
    queryFn: getMyConnections,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const invalidateMyConnectionsQuery = () => {
  return queryClient.invalidateQueries({
    queryKey: getQueryKey(),
    refetchType: 'all',
  });
};
