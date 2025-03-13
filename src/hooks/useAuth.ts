'use client';
import { useContext, useState } from 'react';
import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import {
  getFromSession,
  GlobalAccountSession,
  saveToSession,
} from '@/utils/sessionStorage';
import { IGlobalAccountSession } from '@/types/wallet';
import { generateP256KeyPair } from '@turnkey/crypto';
import { passkeyClient } from '@/config/turnkey';
import { AuthContext } from '@/context/AuthContext';

export const useAuth = () => useContext(AuthContext);

export default useAuth;
