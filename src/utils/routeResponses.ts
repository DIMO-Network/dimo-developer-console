import { NextResponse } from 'next/server';
import { AxiosError } from 'axios';
import type { ApiResult } from '@/types/team';

// Per-user data: never stored by Vercel, Cloudflare or the browser.
export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

// An ApiResult as the response body, unchanged. The status mirrors it so the
// browser sees a refusal as one; 0 (console-api not reached) or anything
// outside 400-599 becomes 502.
export const apiResultResponse = <T>(result: ApiResult<T>) => {
  const status = result.ok
    ? 200
    : result.status >= 400 && result.status <= 599
      ? result.status
      : 502;
  return NextResponse.json(result, { status, headers: PRIVATE_HEADERS });
};

// A thrown upstream error as a fixed message: its own text (URLs, tokens, SQL)
// never reaches the browser.
export const upstreamFailure = (error: unknown, message: string) => {
  const status = error instanceof AxiosError ? (error.response?.status ?? 502) : 500;
  return NextResponse.json({ message }, { status, headers: PRIVATE_HEADERS });
};
