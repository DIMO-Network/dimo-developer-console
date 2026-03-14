'use client';
import { FC, useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { VehicleSimulator } from './index';

interface Props {
  clientId: `0x${string}`;
}

export const VehicleSimulatorModal: FC<Props> = ({ clientId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button className="dark with-icon px-4" onClick={() => setIsOpen(true)}>
        Mint Test Vehicle
      </Button>
      <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
        <VehicleSimulator clientId={clientId} />
      </Modal>
    </>
  );
};
