'use client';

import { FC } from 'react';

interface Props {
  tokenId: number | null;
}

export const VehicleData: FC<Props> = ({ tokenId }) => {
  if (tokenId === null) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-default rounded-xl p-8 text-text-secondary text-sm">
        Select a vehicle to view its data.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-default rounded-xl p-6 h-full">
      <p className="text-sm text-text-secondary font-medium uppercase tracking-wider">
        Vehicle Data — Token #{tokenId}
      </p>
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        Data coming soon.
      </div>
    </div>
  );
};
