'use server';

import * as Sentry from '@sentry/nextjs';
import { AxiosError } from 'axios';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IUser } from '@/types/user';
import { Data } from '@/utils/restClient';
import { IAuth } from '@/types/auth';
import { stripRequestDetails } from '@/utils/upstreamErrors';
import type { SignUpResult } from './signUpResult';

const codeOf = (error: AxiosError): string | undefined =>
  (error.response?.data as { code?: string } | undefined)?.code;

export const completeUserData = async (
  user: Partial<IUser>,
  token?: string,
): Promise<SignUpResult> => {
  const client = await dimoDevAPIClient(5000, token);
  try {
    const { data } = await client.put<IUser>('/api/me/complete', user as Data);
    return { ok: true, data };
  } catch (error) {
    if (
      error instanceof AxiosError &&
      error.response?.status === 409 &&
      codeOf(error) === 'EMAIL_NOT_PROVEN'
    ) {
      return { ok: false, reason: 'EMAIL_NOT_PROVEN' };
    }
    throw error;
  }
};

// Never throws: the page needs to know why it was refused, and a thrown error
// loses its status and code on the way to the browser.
export const createNewUser = async (
  user: Partial<IAuth>,
  token?: string,
): Promise<SignUpResult> => {
  try {
    const client = await dimoDevAPIClient(5000, token);
    const { data } = await client.post<IUser>('/api/user', user);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 409) {
        const code = codeOf(error);
        if (code === 'ACCOUNT_EXISTS') return { ok: false, reason: 'ACCOUNT_EXISTS' };
        if (code === 'EMAIL_TAKEN') return { ok: false, reason: 'EMAIL_TAKEN' };
      }
      if (!error.response) return { ok: false, reason: 'UNREACHABLE' };
    }
    // Anything else, an unexpected 4xx included, is a bug worth seeing once.
    stripRequestDetails(error);
    Sentry.captureException(error);
    return { ok: false, reason: 'FAILED' };
  }
};
