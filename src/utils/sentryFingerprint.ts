import { isAxiosError } from 'axios';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

const ID_SEGMENT =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|0x[0-9a-f]+|\d+)$/i;

export const upstreamRoute = (config?: {
  method?: string;
  url?: string;
  baseURL?: string;
}): string => {
  if (!config?.url) return 'unknown';
  const path = new URL(config.url, config.baseURL || 'http://upstream.invalid').pathname;
  const route = path
    .split('/')
    .map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/');
  return `${(config.method ?? 'get').toUpperCase()} ${route}`;
};

export const fingerprintUpstreamError = (
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent => {
  const error = hint.originalException;
  if (!isAxiosError(error)) return event;
  const route = upstreamRoute(error.config);
  const status = String(error.response?.status ?? error.code ?? 'no-response');
  event.fingerprint = ['axios', route, status];
  event.tags = { ...event.tags, upstream_route: route, upstream_status: status };
  return event;
};
