'use client';

import { useQuery } from '@tanstack/react-query';
import type { Connection } from '@/actions/connections';
import { fetchJson } from '@/utils/fetchJson';
import { queryClient } from '@/hoc/QueryProvider';

const getQueryKey = () => ['my-connections'];

export const useMyConnections = () => {
  return useQuery<Connection[]>({
    queryKey: getQueryKey(),
    queryFn: () => fetchJson<Connection[]>('/api/connections'),
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
