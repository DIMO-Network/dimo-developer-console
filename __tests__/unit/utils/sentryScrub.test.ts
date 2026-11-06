import type { ErrorEvent, NodeOptions } from '@sentry/nextjs';
import {
  EMAIL_PLACEHOLDER,
  dropRequestPayload,
  scrubEmails,
  scrubEmailsDeep,
  scrubSpan,
} from '@/utils/sentryScrub';

type StreamedSpanJSON = Parameters<NonNullable<NodeOptions['beforeSendSpan']>>[0];

describe('sentryScrub', () => {
  describe('scrubEmails', () => {
    it.each([
      [
        'GET https://accounts.dimo.org/api/account/ada@example.com',
        'GET https://accounts.dimo.org/api/account/[email]',
      ],
      [
        'GET https://accounts.dimo.org/api/account/ada.lovelace%40example.co.uk',
        'GET https://accounts.dimo.org/api/account/[email]',
      ],
      [
        'POST https://console.dimo.org/sign-up?email=ada%2Bdev%40example.com&hasGlobalAccount=true',
        'POST https://console.dimo.org/sign-up?email=[email]&hasGlobalAccount=true',
      ],
      ['a@example.com wrote to b@example.org', '[email] wrote to [email]'],
    ])('replaces the email in %s', (text, expected) => {
      expect(scrubEmails(text)).toBe(expected);
    });

    it.each([
      'GET https://console-api.dimo.org/api/me',
      '@sentry/nextjs@11.10.0',
      'user@localhost',
      '',
    ])('leaves %s alone', (text) => {
      expect(scrubEmails(text)).toBe(text);
    });

    it('stays fast on a long string with no email in it', () => {
      const text = `${'a'.repeat(1_000_000)}@`;
      const started = Date.now();
      expect(scrubEmails(text)).toBe(text);
      expect(Date.now() - started).toBeLessThan(1_000);
    });
  });

  describe('scrubEmailsDeep', () => {
    it('scrubs every string in an event and keeps everything else', () => {
      const event = {
        message: 'No sub-organization for ada@example.com',
        request: { url: 'https://console.dimo.org/sign-up?email=ada%40example.com' },
        fingerprint: ['axios', 'GET /api/account/ada%40example.com', '404'],
        tags: { upstream_route: 'GET /api/account/ada%40example.com', status: 404 },
        breadcrumbs: [
          { category: 'navigation', data: { to: '/sign-up?email=ada%40example.com' } },
        ],
        extra: { retried: true, at: null },
      } as unknown as ErrorEvent;

      expect(scrubEmailsDeep(event)).toEqual({
        message: `No sub-organization for ${EMAIL_PLACEHOLDER}`,
        request: { url: 'https://console.dimo.org/sign-up?email=[email]' },
        fingerprint: ['axios', 'GET /api/account/[email]', '404'],
        tags: { upstream_route: 'GET /api/account/[email]', status: 404 },
        breadcrumbs: [{ category: 'navigation', data: { to: '/sign-up?email=[email]' } }],
        extra: { retried: true, at: null },
      });
    });

    it('returns on a cycle instead of looping', () => {
      const looped: Record<string, unknown> = { email: 'ada@example.com' };
      looped.self = looped;
      expect(scrubEmailsDeep(looped)).toMatchObject({ email: EMAIL_PLACEHOLDER });
    });
  });

  it('scrubs a span name and its attributes', () => {
    const span = {
      trace_id: 't',
      span_id: 's',
      name: 'GET https://accounts.dimo.org/api/account/ada%40example.com',
      start_timestamp: 1,
      status: 'ok',
      is_segment: false,
      attributes: {
        'url.full': 'https://accounts.dimo.org/api/account/ada%40example.com',
        'http.response.status_code': 200,
      },
    } as StreamedSpanJSON;

    expect(scrubSpan(span)).toEqual({
      ...span,
      name: 'GET https://accounts.dimo.org/api/account/[email]',
      attributes: {
        'url.full': 'https://accounts.dimo.org/api/account/[email]',
        'http.response.status_code': 200,
      },
    });
  });

  it('drops a request body and cookies', () => {
    const event = {
      request: { url: '/x', data: '{"key":"secret"}', cookies: { session: 'jwt' } },
    } as unknown as ErrorEvent;
    expect(dropRequestPayload(event).request).toEqual({ url: '/x' });
  });
});
