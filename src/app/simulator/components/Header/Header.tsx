import React from 'react';

export const Header = () => {
  return (
    <div className="flex flex-row gap-1 pb-2 border-b-cta-default border-b">
      <p className={'text-base text-text-secondary font-medium'}>
        Simulated vehicles are non-earning vehicles with simulated signals for developers
        to build on. A simulated vehicle will be owned by your DIMO account and will need
        to share permissions with your developer license as a DIMO end user would.
      </p>
    </div>
  );
};
