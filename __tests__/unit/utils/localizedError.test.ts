import { errorText, LocalizedError } from '@/utils/localizedError';

describe('errorText', () => {
  const t = (key: string, values?: Record<string, string | number>) =>
    `${key}:${JSON.stringify(values ?? {})}`;

  it('translates an error that carries a key, and keeps its English message', () => {
    const error = new LocalizedError('a.b', 'In English', { n: 2 });
    expect(error.message).toBe('In English');
    expect(errorText(t, error, 'fallback')).toBe('a.b:{"n":2}');
  });

  it('shows the message of any other error', () => {
    expect(errorText(t, new Error('boom'), 'fallback')).toBe('boom');
  });

  it('falls back when there is no message', () => {
    expect(errorText(t, new Error(''), 'fallback')).toBe('fallback');
    expect(errorText(t, 'nope', 'fallback')).toBe('fallback');
  });
});
