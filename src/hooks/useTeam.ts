'use client';
import { useContext } from 'react';
import { TeamContext } from '@/context/TeamContext';

export const useTeam = () => useContext(TeamContext);

export default useTeam;
