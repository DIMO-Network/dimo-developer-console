import { NextResponse } from 'next/server';
import { AxiosError } from 'axios';
import type { ApiResult } from '@/types/team';

// Per-user data: never stored by Vercel, Cloudflare or the browser.
export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

export const UNREACHABLE_MESSAGE = 'Could not reach the console API';

// An ApiResult as the response body, unchanged. The status mirrors it so the
// browser sees a refusal as one; 0 (console-api not reached) or anything
// outside 400-599 becomes 502.
export const apiResultResponse = <T>(result: ApiResult<T>) => {
  const status = result.ok
    ? 200
    : result.status >= 400 && result.status <= 599
      ? result.status
      : 502;
  // A status-0 or 5xx failure carries the transport's own text (hostnames, ports):
  // the browser gets a fixed message. 4xx refusals keep console-api's message.
  const body =
    !result.ok && (result.status === 0 || result.status >= 500)
      ? { ...result, message: UNREACHABLE_MESSAGE }
      : result;
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
};

// A thrown upstream error as a fixed message: its own text (URLs, tokens, SQL)
// never reaches the browser.
export const upstreamFailure = (error: unknown, message: string) => {
  const status = error instanceof AxiosError ? (error.response?.status ?? 502) : 500;
  return NextResponse.json({ message }, { status, headers: PRIVATE_HEADERS });
};
