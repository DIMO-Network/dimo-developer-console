'use client';

import { useState, useEffect } from 'react';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehicleList } from './VehicleList';
import { VehicleData } from './VehicleData';

const ExplorerContent = () => {
  const { developerLicenses, loading } = useValidDeveloperLicenses();
  const [selectedLicense, setSelectedLicense] = useState<LocalDeveloperLicense>();
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && developerLicenses.length === 1 && !selectedLicense) {
      setSelectedLicense(developerLicenses[0]);
    }
  }, [loading, developerLicenses, selectedLicense]);

  const handleLicenseChange = (license: LocalDeveloperLicense) => {
    setSelectedLicense(license);
    setSelectedTokenId(null);
  };

  return (
    <>
      <DevLicenseSelector
        developerLicenses={developerLicenses}
        onChange={handleLicenseChange}
        selectedLicense={selectedLicense}
      />
      {selectedLicense && (
        <div className="flex flex-row gap-4" style={{ minHeight: '600px' }}>
          <div className="w-72 flex-shrink-0 flex flex-col">
            <VehicleList
              clientId={selectedLicense.clientId}
              selectedTokenId={selectedTokenId}
              onSelectVehicle={setSelectedTokenId}
            />
          </div>
          <div className="flex-1 flex flex-col">
            <VehicleData tokenId={selectedTokenId} />
          </div>
        </div>
      )}
    </>
  );
};

export const ExplorerView = () => {
  const { loading, error } = useValidDeveloperLicenses();
  return (
    <div className="flex flex-col gap-6">
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage="There was a problem fetching your Developer Licenses"
      >
        <ExplorerContent />
      </QueryPageWrapper>
    </div>
  );
};
