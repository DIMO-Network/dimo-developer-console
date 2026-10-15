'use client';

import { useQuery } from '@tanstack/react-query';
import { IUser } from '@/types/user';
import { fetchJson } from '@/utils/fetchJson';

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => fetchJson<IUser>('/api/me'),
  });
};

export default useUser;
