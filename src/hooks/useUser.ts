'use client';

import { getUser } from '@/actions/user';
import { IUser } from '@/types/user';
import { useEffect, useState } from 'react';

export const useUser = () => {
  const [user, setUser] = useState<IUser>();

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return { user, setUser };
};

export default useUser;
