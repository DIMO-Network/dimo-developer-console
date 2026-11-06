import type { ErrorEvent, NodeOptions } from '@sentry/nextjs';
import {
  EMAIL_PLACEHOLDER,
  TRUNCATED,
  dropRequestPayload,
  scrubEmails,
  scrubEmailsDeep,
  scrubRecordingEvent,
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
      // Encoded twice: an email inside a URL inside a query string. Encoded
      // separators read as part of the address, so what's next to it goes too.
      [
        '/next?redirect=%2Fsign-up%3Femail%3Dada%2540example.com',
        '/next?redirect=[email]',
      ],
      ["o'neil+dev@example.io", '[email]'],
      ['jürgen@exämple.de', '[email]'],
      ['ada@xn--80ak6aa92e.xn--p1ai', '[email]'],
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
      const scrubbed = scrubEmailsDeep(looped);
      expect(scrubbed).toMatchObject({ email: EMAIL_PLACEHOLDER });
      expect(scrubbed.self).toBe(scrubbed);
    });

    it('scrubs an object every place it appears, not only the first', () => {
      const shared = { url: '/sign-up?email=ada%40example.com' };
      const scrubbed = scrubEmailsDeep({ first: shared, second: [shared] });
      expect(scrubbed.first).toEqual({ url: '/sign-up?email=[email]' });
      expect(scrubbed.second[0]).toBe(scrubbed.first);
      expect(shared.url).toBe('/sign-up?email=ada%40example.com');
    });

    it('drops anything nested deeper than it goes', () => {
      let deep: unknown = { email: 'ada@example.com' };
      for (let level = 0; level < 20; level += 1) deep = { deep };
      expect(JSON.stringify(scrubEmailsDeep(deep))).not.toContain('ada');
      expect(JSON.stringify(scrubEmailsDeep(deep))).toContain(TRUNCATED);
    });

    it('scrubs keys', () => {
      expect(scrubEmailsDeep({ 'ada@example.com': 1 })).toEqual({ '[email]': 1 });
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

  describe('scrubRecordingEvent', () => {
    it("scrubs a replay's page URL and its request spans", () => {
      const meta = {
        type: 4,
        timestamp: 1,
        data: { href: 'https://console.dimo.org/sign-up?email=ada%40example.com' },
      };
      const span = {
        type: 5,
        timestamp: 2,
        data: {
          tag: 'performanceSpan',
          payload: {
            description: 'https://accounts.dimo.org/api/account/ada%40example.com',
          },
        },
      };
      expect(scrubRecordingEvent(meta).data.href).toBe(
        'https://console.dimo.org/sign-up?email=[email]',
      );
      expect(scrubRecordingEvent(span).data.payload.description).toBe(
        'https://accounts.dimo.org/api/account/[email]',
      );
    });

    it("leaves DOM snapshots to Replay's own masking", () => {
      const snapshot = {
        type: 2,
        timestamp: 3,
        data: { node: { textContent: 'ada@example.com' } },
      };
      expect(scrubRecordingEvent(snapshot)).toBe(snapshot);
    });
  });
});
