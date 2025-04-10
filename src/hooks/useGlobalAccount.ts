'use client';

import { useContext } from 'react';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';

export const useGlobalAccount = () => useContext(GlobalAccountContext);

export default useGlobalAccount;
