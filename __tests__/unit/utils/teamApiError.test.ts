import { TeamApiError, unwrap } from '@/utils/teamApiError';

describe('unwrap', () => {
  it('returns the data of a success', () => {
    expect(unwrap({ ok: true, data: 1 })).toBe(1);
  });

  it('throws a TeamApiError carrying the console-api code', () => {
    expect(() =>
      unwrap({ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'Not a member' }),
    ).toThrow(new TeamApiError(403, 'NOT_A_MEMBER', 'Not a member'));
    try {
      unwrap({ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'x' });
    } catch (error) {
      expect(error).toBeInstanceOf(TeamApiError);
      expect((error as TeamApiError).code).toBe('NOT_A_MEMBER');
    }
  });
});
