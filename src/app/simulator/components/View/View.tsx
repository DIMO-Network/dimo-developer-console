'use client';

import React from 'react';
import { Header } from '../Header';
import { SimulatedVehiclesSection } from '../SimulatedVehiclesSection';

import './View.css';

const View: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <Header />
      <SimulatedVehiclesSection />
    </div>
  );
};

export default View;
