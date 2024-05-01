'use server';
import { getUserByToken } from '@/services/user';

export async function getUser() {
  return getUserByToken();
}
