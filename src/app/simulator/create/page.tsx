import React from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

export const metadata: Metadata = {
  title: `Create Simulated Vehicle | ${configuration.appName}`,
};

const CreateSimulatedVehiclePage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-1 pb-2 border-b-cta-default border-b">
        <p className={'text-base text-text-secondary font-medium'}>
          Create a new simulated vehicle for testing and development purposes.
        </p>
      </div>

      <div className="flex items-center justify-center min-h-96">
        <p className="text-text-secondary text-center">
          Create simulated vehicle form coming soon...
        </p>
      </div>
    </div>
  );
};

export default CreateSimulatedVehiclePage;
