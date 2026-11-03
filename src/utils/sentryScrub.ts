import type { ErrorEvent } from '@sentry/nextjs';

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
