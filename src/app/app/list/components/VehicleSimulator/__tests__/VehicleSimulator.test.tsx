import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleSimulator } from '../index';

jest.mock('@/hooks', () => ({
  useMintVehicle: jest.fn(() => jest.fn()),
}));

jest.mock('@/actions/simulatedVehicles', () => ({
  getSimulatedVehicles: jest.fn(),
  recordSimulatedVehicle: jest.fn(),
}));

const { getSimulatedVehicles } = jest.requireMock('@/actions/simulatedVehicles');

const mockClientId = '0x1234567890123456789012345678901234567890' as `0x${string}`;

const makeStoredVehicle = (overrides = {}) => ({
  id: 'uuid-1',
  user_id: 'user-1',
  token_id: 42,
  make: 'Toyota',
  model: 'Camry',
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
    expect(screen.getByText('Vehicle Simulator')).toBeInTheDocument();
  });

  it('renders make selector buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Toyota' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ford' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tesla' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BMW' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Honda' })).toBeInTheDocument();
  });

  it('disables the mint button until all fields are selected', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  it('enables the mint button when make, model, and year are all selected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).not.toBeDisabled();
  });

  it('resets selected model when make changes', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ford' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  it('disables mint and shows limit message when stored vehicle count is at limit', async () => {
    getSimulatedVehicles.mockResolvedValue([makeStoredVehicle()]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });
});
