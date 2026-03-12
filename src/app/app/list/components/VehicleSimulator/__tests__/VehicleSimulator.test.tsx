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
      <NotificationContext.Provider value={{ setNotification: mockSetNotification }}>
        <MockedProvider>
          <VehicleSimulator clientId={mockClientId} />
        </MockedProvider>
      </NotificationContext.Provider>,
    );

  it('renders the section heading', () => {
    renderComponent();
    expect(screen.getByText('Vehicle Simulator')).toBeInTheDocument();
  });

  it('renders the Make, Model, and Year dropdowns', () => {
    renderComponent();
    expect(screen.getByLabelText('Make')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('disables the mint button until all fields are selected', () => {
    renderComponent();
    const button = screen.getByRole('button', { name: /create a simulated vehicle/i });
    expect(button).toBeDisabled();
  });

  it('enables the mint button when all dropdowns are selected', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'toyota' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'camry' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2022' } });
    const button = screen.getByRole('button', { name: /create a simulated vehicle/i });
    expect(button).not.toBeDisabled();
  });

  it('resets model when make changes', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'toyota' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'camry' } });
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'ford' } });
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('');
  });
});
