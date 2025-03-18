'use server';

import * as Sentry from '@sentry/nextjs';

import { sendSupportEmail } from '@/services/support';
import { ISupportRequest } from '@/types/support';

export const handleSupportRequest = async (supportRequest: ISupportRequest) => {
  try {
    const response = await sendSupportEmail(supportRequest);
    return response;
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error sending support email:', error);
    throw error;
  }
};
