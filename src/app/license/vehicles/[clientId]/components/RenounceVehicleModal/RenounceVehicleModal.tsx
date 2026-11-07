'use client';
import { FC, useState } from 'react';
import { useTranslations } from 'next-intl';
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

type Translate = (key: string, values?: Record<string, string | number>) => string;

function vehicleName(vehicle: Vehicle, t: Translate): string {
  const { make, model, year } = vehicle.definition ?? {};
  if (make || model || year) {
    return [make, model, year].filter(Boolean).join(' ');
  }
  return t('renounce.tokenFallback', { tokenId: vehicle.tokenId });
}

export const RenounceVehicleModal: FC<Props> = ({ vehicle, onConfirm, onClose }) => {
  const t = useTranslations('license');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('renounce.failed'));
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
          <WarningAmberIcon className="h-6 w-6 shrink-0 text-warning" />
          <Title component="h2" className="text-panel-title">
            {t('renounce.title')}
          </Title>
        </div>

        {vehicle && (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-ink">{vehicleName(vehicle, t)}</p>
            <p className="text-body-sm text-muted">
              {t('renounce.tokenId', { tokenId: vehicle.tokenId })}
            </p>
          </div>
        )}

        <p className="text-muted">{t('renounce.warning')}</p>

        {error && <p className="text-body-sm text-negative">{error}</p>}

        <div className="mt-2 flex flex-col gap-3">
          <Button
            variant="destructive"
            className="w-full"
            loading={isLoading}
            onClick={handleConfirm}
          >
            {t('renounce.action')}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={isLoading}
            onClick={onClose}
          >
            {tCommon('actions.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
