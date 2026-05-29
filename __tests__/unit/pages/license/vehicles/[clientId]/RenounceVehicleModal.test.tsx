import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RenounceVehicleModal } from '@/app/license/vehicles/[clientId]/components/RenounceVehicleModal';

const vehicleWithMMY = {
  tokenId: 42,
  definition: { make: 'Tesla', model: 'Model 3', year: 2022 },
};

const vehicleNoDefinition = {
  tokenId: 99,
  definition: null,
};

describe('RenounceVehicleModal', () => {
  it('renders nothing when vehicle is null', () => {
    const { container } = render(
      <RenounceVehicleModal vehicle={null} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows vehicle MMY when definition is present', () => {
    render(
      <RenounceVehicleModal
        vehicle={vehicleWithMMY}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Tesla Model 3 2022')).toBeInTheDocument();
    expect(screen.getByText('Token ID: 42')).toBeInTheDocument();
  });

  it('falls back to Token # label when no definition', () => {
    render(
      <RenounceVehicleModal
        vehicle={vehicleNoDefinition}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Token #99')).toBeInTheDocument();
  });

  it('shows consequence copy', () => {
    render(
      <RenounceVehicleModal
        vehicle={vehicleWithMMY}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/You will lose all data access to this vehicle/),
    ).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <RenounceVehicleModal
        vehicle={vehicleWithMMY}
        onConfirm={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Renounce access is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <RenounceVehicleModal
        vehicle={vehicleWithMMY}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Renounce access'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('shows inline error when onConfirm rejects', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('Transaction reverted'));
    render(
      <RenounceVehicleModal
        vehicle={vehicleWithMMY}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Renounce access'));
    await waitFor(() =>
      expect(screen.getByText('Transaction reverted')).toBeInTheDocument(),
    );
  });

  it('keeps modal open after error', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('fail'));
    const onClose = jest.fn();
    render(
      <RenounceVehicleModal
        vehicle={vehicleWithMMY}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText('Renounce access'));
    await waitFor(() => expect(screen.getByText('fail')).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });
});
