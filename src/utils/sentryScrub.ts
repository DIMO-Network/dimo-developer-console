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
// so a path or query before it is kept.
// Found from each @, not by a regex over the whole string: one tried at every
// position costs up to 64 steps a character, about 0.4 s for a 1 MB string
// with an @ and no email. From the @ the scan is linear.
const AT = /@|%(?:25)*40/g;
const LOCAL_CHAR = /^[\p{L}\p{N}._%+!$'*^`{|}~-]$/u;
const LOCAL_MAX = 64;
const DOMAIN = /[\p{L}\p{N}.%-]{1,253}\.\p{L}[\p{L}\p{N}-]{1,62}/uy;
export const EMAIL_PLACEHOLDER = '[email]';
// What replaces anything nested deeper than the scrubber goes.
export const TRUNCATED = '[truncated]';

// Where the local part before `at` starts: up to 64 characters back, whole
// code points (a surrogate pair is one character).
const localStart = (text: string, at: number, floor: number): number => {
  let start = at;
  for (let count = 0; start > floor && count < LOCAL_MAX; count += 1) {
    const low = text.charCodeAt(start - 1);
    const width = low >= 0xdc00 && low <= 0xdfff && start - 2 >= floor ? 2 : 1;
    if (!LOCAL_CHAR.test(text.slice(start - width, start))) break;
    start -= width;
  }
  return start;
};

export const scrubEmails = (text: string): string => {
  let scrubbed = '';
  let copied = 0;
  AT.lastIndex = 0;
  for (let at = AT.exec(text); at; at = AT.exec(text)) {
    const start = localStart(text, at.index, copied);
    if (start === at.index) continue;
    DOMAIN.lastIndex = at.index + at[0].length;
    if (!DOMAIN.exec(text)) continue;
    scrubbed += text.slice(copied, start) + EMAIL_PLACEHOLDER;
    copied = DOMAIN.lastIndex;
    AT.lastIndex = copied;
  }
  return copied === 0 ? text : scrubbed + text.slice(copied);
};

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

// rrweb's meta (4: the page's href) and custom (5: breadcrumbs, request and
// navigation spans) events: where a replay records URLs. The DOM snapshots
// are masked by Replay itself (text and inputs).
const REPLAY_EVENTS_WITH_URLS = new Set([4, 5]);

export const scrubRecordingEvent = <T extends { type: number }>(event: T): T =>
  REPLAY_EVENTS_WITH_URLS.has(event.type) ? scrubEmailsDeep(event) : event;
