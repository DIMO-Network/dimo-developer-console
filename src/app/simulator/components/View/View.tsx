'use client';

import React from 'react';
import { Header } from '../Header';
import { SimulatedVehiclesSection } from '../SimulatedVehiclesSection';
import { CreateSimulatedVehicleModal } from '../CreateSimulatedVehicleModal';

import './View.css';

const View: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <Header />
      <SimulatedVehiclesSection />
      <CreateSimulatedVehicleModal
        isOpen={false}
        title={'Hello!'}
        onConfirm={function (): void {
          throw new Error('Function not implemented.');
        }}
        onCancel={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    </div>
  );
};

export default View;
