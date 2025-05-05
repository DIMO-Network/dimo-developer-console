import axios from 'axios';

export const extractAxiosMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data.message || err.response?.data?.error || err.message || fallback
    );
  }
  return `Unexpected error: ${fallback.toLowerCase()}`;
};
