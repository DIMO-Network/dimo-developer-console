import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';

import { useToggleStatus } from '@/components/Webhooks/hooks/useToggleStatus';
import type { Webhook } from '@/types/webhook';

jest.mock('sonner', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/utils/devJwt', () => ({ getDevJwt: () => 'jwt' }));
jest.mock('@/services/webhook', () => ({ updateWebhook: jest.fn() }));
jest.mock('@/hooks/queries/useWebhooks', () => ({ invalidateQuery: jest.fn() }));

const webhookWith = (status: string) => ({ id: 'wh-1', status }) as Webhook;

describe('useToggleStatus', () => {
  it.each([
    ['enabled', 'Updating webhook status to disabled'],
    ['disabled', 'Updating webhook status to enabled'],
  ])(
    'announces the next status of a %s webhook as one sentence',
    async (status, text) => {
      const { result } = renderHook(() => useToggleStatus(webhookWith(status), 'client'));
      await act(() => result.current.handleChangeStatus());
      expect(toast.info).toHaveBeenCalledWith(text);
    },
  );
});
