import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/services/webhook', () => ({
  subscribeAllVehicles: jest.fn(),
  unsubscribeAllVehicles: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/hooks/queries/useWebhookVehiclesById', () => ({
  useWebhookVehiclesById: () => ({ data: [1, 2], isLoading: false, error: null }),
  invalidateQuery: jest.fn(),
}));
jest.mock('@/utils/devJwt', () => ({ getDevJwt: () => 'dev.jwt' }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/components/Webhooks/edit/AddVehiclesModal', () => ({
  AddVehiclesModal: () => null,
}));
jest.mock('@/components/Webhooks/edit/UnsubscribeVehiclesModal', () => ({
  UnsubscribeVehiclesModal: () => null,
}));
import { unsubscribeAllVehicles } from '@/services/webhook';
import { SubscribedVehicles } from '@/components/Webhooks/edit/SubscribedVehicles';

describe('SubscribedVehicles', () => {
  it('asks before unsubscribing every vehicle, which cannot be undone', async () => {
    render(<SubscribedVehicles webhookId="w1" clientId="0xabc" />);

    fireEvent.click(screen.getByRole('button', { name: 'Unsubscribe all vehicles' }));

    expect(await screen.findByText(/cannot be undone/)).toBeInTheDocument();
    expect(unsubscribeAllVehicles).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Unsubscribe all' }));
    await waitFor(() =>
      expect(unsubscribeAllVehicles).toHaveBeenCalledWith({
        webhookId: 'w1',
        token: 'dev.jwt',
      }),
    );
  });
});
