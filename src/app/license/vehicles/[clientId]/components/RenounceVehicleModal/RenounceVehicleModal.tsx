'use client';
import { FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { WarningAmberIcon } from '@/components/Icons';

interface Vehicle {
  tokenId: number;
  definition?: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
}

interface Props {
  vehicle: Vehicle | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function vehicleName(vehicle: Vehicle): string {
  const { make, model, year } = vehicle.definition ?? {};
  if (make || model || year) {
    return [make, model, year].filter(Boolean).join(' ');
  }
  return `Token #${vehicle.tokenId}`;
}

export const RenounceVehicleModal: FC<Props> = ({ vehicle, onConfirm, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={vehicle !== null}
      setIsOpen={isLoading ? () => {} : onClose}
      showClose={!isLoading}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <WarningAmberIcon className="h-6 w-6 flex-shrink-0 text-warning" />
          <Title component="h2" className="text-panel-title">
            Renounce vehicle access?
          </Title>
        </div>

        {vehicle && (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-ink">{vehicleName(vehicle)}</p>
            <p className="text-body-sm text-muted">Token ID: {vehicle.tokenId}</p>
          </div>
        )}

        <p className="text-muted">
          You will lose all data access to this vehicle. The vehicle owner would need to
          re-grant access.
        </p>

        {error && <p className="text-body-sm text-negative">{error}</p>}

        <div className="mt-2 flex flex-col gap-3">
          <Button
            variant="destructive"
            className="w-full"
            loading={isLoading}
            onClick={handleConfirm}
          >
            Renounce access
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={isLoading}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
