'use server';
import { getMyLicense } from '@/services/license';

export const getLicense = async () => {
  return getMyLicense();
};
