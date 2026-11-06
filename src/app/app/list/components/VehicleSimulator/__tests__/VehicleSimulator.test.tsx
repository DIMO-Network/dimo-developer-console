import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { VehicleSimulator } from '../index';
import { SIMULATOR_GRANTEE } from '../constants';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/zerodev', () => ({
  getPublicClient: jest.fn(),
}));

jest.mock('@/hooks/useMintVehicle', () => ({
  useMintVehicle: jest.fn(() => jest.fn()),
}));
jest.mock('@/hooks/useBurnVehicle', () => ({
  useBurnVehicle: jest.fn(() => jest.fn()),
}));
jest.mock('@/hooks/useGlobalAccount', () => ({
  useGlobalAccount: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('@/actions/simulatedVehicles', () => ({
  recordSimulatedVehicle: jest.fn(),
  registerVehicleWithSimulator: jest.fn(),
}));

jest.mock('@/utils/fetchJson', () => ({ fetchJson: jest.fn() }));

const { recordSimulatedVehicle, registerVehicleWithSimulator } = jest.requireMock(
  '@/actions/simulatedVehicles',
);
const getSimulatedVehicles = jest.requireMock('@/utils/fetchJson').fetchJson;
const { useMintVehicle } = jest.requireMock('@/hooks/useMintVehicle');
const { useGlobalAccount } = jest.requireMock('@/hooks/useGlobalAccount');

const mockClientId = '0x1234567890123456789012345678901234567890' as `0x${string}`;

const makeStoredVehicle = (overrides = {}) => ({
  id: 'uuid-1',
  user_id: 'user-1',
  token_id: 42,
  make: 'Toyota',
  model: 'RAV4',
  year: 2022,
  client_id: mockClientId,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <VehicleSimulator clientId={mockClientId} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  getSimulatedVehicles.mockResolvedValue([]);
});

describe('VehicleSimulator', () => {
  it('renders the section heading', () => {
    renderComponent();
    expect(screen.getByText('Vehicle simulator')).toBeInTheDocument();
  });

  it('renders region selector buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'USA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Japan' })).toBeInTheDocument();
  });

  it('renders make selector buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Toyota' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ford' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chevrolet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BMW' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Honda' })).toBeInTheDocument();
  });

  it('disables the mint button until all fields are selected', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  it('enables the mint button when region, make, model, and year are all selected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'USA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'RAV4' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).not.toBeDisabled();
  });

  it('resets selected model when make changes', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'USA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'RAV4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ford' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  it('disables mint and shows limit message when stored vehicle count is at limit', async () => {
    getSimulatedVehicles.mockResolvedValue([makeStoredVehicle()]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'USA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'RAV4' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  describe('minting', () => {
    const mintVehicle = jest.fn();

    beforeEach(() => {
      useMintVehicle.mockReturnValue(mintVehicle);
      useGlobalAccount.mockReturnValue({
        currentUser: {
          smartContractAddress: '0x9999999999999999999999999999999999999999',
        },
      });
      recordSimulatedVehicle.mockResolvedValue({ success: true });
      registerVehicleWithSimulator.mockResolvedValue({ status: 'registered' });
    });

    afterEach(() => {
      useMintVehicle.mockReturnValue(jest.fn());
      useGlobalAccount.mockReturnValue({ currentUser: null });
    });

    const mint = async () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: 'USA' }));
      fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
      fireEvent.click(screen.getByRole('button', { name: 'RAV4' }));
      fireEvent.click(screen.getByRole('button', { name: '2022' }));
      fireEvent.click(screen.getByRole('button', { name: /mint vehicle/i }));
      await waitFor(() => expect(mintVehicle).toHaveBeenCalled());
    };

    it('grants the simulator and the license that minted the vehicle', async () => {
      mintVehicle.mockResolvedValue({ success: true, tokenId: 42, sacdFailed: false });

      await mint();

      expect(mintVehicle).toHaveBeenCalledWith(
        expect.objectContaining({ sacdGrantees: [SIMULATOR_GRANTEE, mockClientId] }),
      );
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Vehicle minted successfully!'),
      );
    });

    it('records the vehicle and warns that neither grant landed', async () => {
      mintVehicle.mockResolvedValue({ success: true, tokenId: 42, sacdFailed: true });

      await mint();

      await waitFor(() =>
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringContaining('neither the simulator nor this license was granted'),
        ),
      );
      expect(recordSimulatedVehicle).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: 42, clientId: mockClientId }),
      );
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
