'use client';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export const useAuth = () => useContext(AuthContext);

export default useAuth;
