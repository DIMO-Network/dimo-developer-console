import type { ApiResult } from '@/types/team';

// Thrown by React Query functions so TeamProvider can see a console-api code
// (NOT_A_MEMBER) from any team-scoped query.
export class TeamApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'TeamApiError';
  }
}

export const unwrap = <T>(result: ApiResult<T>): T => {
  if (result.ok) return result.data;
  throw new TeamApiError(result.status, result.code, result.message);
};
