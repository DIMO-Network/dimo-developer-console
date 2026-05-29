'use client';
import { FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { BeakerIcon } from '@heroicons/react/24/outline';
import { VehicleSimulator } from './index';

interface Props {
  clientId: `0x${string}`;
}

export const VehicleSimulatorModal: FC<Props> = ({ clientId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        className="table-action-button with-icon px-4"
        onClick={() => setIsOpen(true)}
      >
        <BeakerIcon className="h-4 w-4" />
        Vehicle Simulator
      </Button>
      <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
        <VehicleSimulator clientId={clientId} />
      </Modal>
    </>
  );
};
