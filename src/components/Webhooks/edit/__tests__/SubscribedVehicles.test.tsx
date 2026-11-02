import { act, fireEvent, render, screen } from '@testing-library/react';
import { SubscribedVehicles } from '../SubscribedVehicles';

// The same array on every call, as TanStack Query returns until the data changes.
const tokenIds = Array.from({ length: 25 }, (_, i) => String(i + 1));

jest.mock('@/hooks/queries/useWebhookVehiclesById', () => ({
  invalidateQuery: jest.fn(),
  useWebhookVehiclesById: () => ({ data: tokenIds, isLoading: false, error: null }),
}));
jest.mock('@/services/webhook', () => ({
  subscribeAllVehicles: jest.fn(),
  unsubscribeAllVehicles: jest.fn(),
}));

// The table moves to its next page after a queued update.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

it('stays on the page the user picked when the section re-renders', async () => {
  const { rerender } = render(<SubscribedVehicles webhookId="wh-1" clientId="0xabc" />);
  await settle();

  const buttons = screen.getAllByRole('button');
  fireEvent.click(buttons[buttons.length - 1]);
  await settle();
  expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();

  rerender(<SubscribedVehicles webhookId="wh-1" clientId="0xabc" />);
  await settle();
  expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
});
