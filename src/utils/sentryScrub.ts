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
// Sentry's span tables. The @ may be plain or URL-encoded once or more (%40,
// %2540). The local part takes RFC 5322's characters except a URL's / ? & = #,
// so a path or query before it is kept. The bounds keep a long string without
// an email cheap to scan.
const EMAIL =
  /[\p{L}\p{N}._%+!$'*^`{|}~-]{1,64}(?:@|%(?:25)*40)[\p{L}\p{N}.%-]{1,253}\.\p{L}[\p{L}\p{N}-]{1,62}/gu;
const HAS_AT = /@|%(?:25)*40/;
export const EMAIL_PLACEHOLDER = '[email]';
// What replaces anything nested deeper than the scrubber goes.
export const TRUNCATED = '[truncated]';

export const scrubEmails = (text: string): string =>
  HAS_AT.test(text) ? text.replace(EMAIL, EMAIL_PLACEHOLDER) : text;

// Deep enough for an event's request, contexts, breadcrumbs and span data.
const MAX_DEPTH = 12;

// Fails closed: past MAX_DEPTH nothing goes through, and an object met twice
// (shared or in a cycle) gets the same scrubbed copy, never the original.
const scrub = (value: unknown, depth: number, copies: Map<object, unknown>): unknown => {
  if (typeof value === 'string') return scrubEmails(value);
  if (typeof value !== 'object' || value === null) return value;
  if (depth > MAX_DEPTH) return TRUNCATED;
  const known = copies.get(value);
  if (known !== undefined) return known;
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    copies.set(value, copy);
    value.forEach((item) => copy.push(scrub(item, depth + 1, copies)));
    return copy;
  }
  const copy: Record<string, unknown> = {};
  copies.set(value, copy);
  for (const [key, item] of Object.entries(value)) {
    copy[scrubEmails(key)] = scrub(item, depth + 1, copies);
  }
  return copy;
};

// Every string in it, keys included.
export const scrubEmailsDeep = <T>(value: T): T => scrub(value, 0, new Map()) as T;

// Spans are streamed (Sentry 11's default), so they never pass through an
// event hook: they're scrubbed one by one.
export const scrubSpan = (span: StreamedSpanJSON): StreamedSpanJSON => ({
  ...span,
  name: scrubEmails(span.name),
  attributes: scrubEmailsDeep(span.attributes),
});
