import type { ErrorEvent, NodeOptions } from '@sentry/nextjs';

// The span beforeSendSpan receives: Sentry 11 streams spans by default.
type StreamedSpanJSON = Parameters<NonNullable<NodeOptions['beforeSendSpan']>>[0];

// A server action's request body is its arguments (private keys, signed challenges,
// access tokens) and the cookies hold the session. The server config already stops
// Sentry collecting either; this drops them if anything still attaches them.
export const dropRequestPayload = (event: ErrorEvent): ErrorEvent => {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
  }
  return event;
};

// Emails reach Sentry inside URLs: the accounts lookup
// (accounts.dimo.org/api/account/<email>), /sign-up?email= and the passkey
// recovery link. They name span groups, so every user's address ended up in
// Sentry's span tables. Plain or URL-encoded (%40); the bounds keep a long
// string without one cheap to scan.
const EMAIL = /[A-Za-z0-9._%+-]{1,64}(?:@|%40)[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}/g;
export const EMAIL_PLACEHOLDER = '[email]';

export const scrubEmails = (text: string): string =>
  text.includes('@') || text.includes('%40')
    ? text.replace(EMAIL, EMAIL_PLACEHOLDER)
    : text;

// Deep enough for an event's request, contexts, breadcrumbs and span data.
const MAX_DEPTH = 12;

const scrub = (value: unknown, depth: number, seen: WeakSet<object>): unknown => {
  if (typeof value === 'string') return scrubEmails(value);
  if (typeof value !== 'object' || value === null || depth > MAX_DEPTH) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, scrub(item, depth + 1, seen)]),
  );
};

// Every string in it, keys aside.
export const scrubEmailsDeep = <T>(value: T): T => scrub(value, 0, new WeakSet()) as T;

// Spans are streamed (Sentry 11's default), so they never pass through an
// event hook: they're scrubbed one by one.
export const scrubSpan = (span: StreamedSpanJSON): StreamedSpanJSON => ({
  ...span,
  name: scrubEmails(span.name),
  attributes: scrubEmailsDeep(span.attributes),
});
