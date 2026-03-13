import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VehicleSimulator } from '../index';
import { MockedProvider } from '@apollo/client/testing';
import { NotificationContext } from '@/context/notificationContext';

// Mock useMintVehicle — no Web3 infrastructure needed in unit tests
jest.mock('@/hooks', () => ({
  useMintVehicle: jest.fn(() => jest.fn()),
}));

const mockSetNotification = jest.fn();
const mockClientId = '0x1234567890123456789012345678901234567890' as `0x${string}`;

describe('VehicleSimulator', () => {
  const renderComponent = () =>
    render(
      <NotificationContext.Provider
        value={{ setNotification: mockSetNotification, notifications: [] }}
      >
        <MockedProvider>
          <VehicleSimulator clientId={mockClientId} />
        </MockedProvider>
      </NotificationContext.Provider>,
    );

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
    expect(
      screen.getByRole('button', { name: /mint simulated vehicle/i }),
    ).toBeDisabled();
  });

  it('enables the mint button when make, model, and year are all selected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(
      screen.getByRole('button', { name: /mint simulated vehicle/i }),
    ).not.toBeDisabled();
  });

  it('resets selected model when make changes', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ford' }));
    // Mint button should still be disabled since model was reset
    expect(
      screen.getByRole('button', { name: /mint simulated vehicle/i }),
    ).toBeDisabled();
  });
});
