'use client';

import { useState, useEffect } from 'react';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehicleList } from './VehicleList';
import { VehicleData } from './VehicleData';

const ExplorerContent = ({ initialTokenId }: { initialTokenId?: number }) => {
  const { developerLicenses, loading } = useValidDeveloperLicenses();
  const [selectedLicense, setSelectedLicense] = useState<LocalDeveloperLicense>();
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(
    initialTokenId ?? null,
  );

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
        <div className="flex flex-col gap-4 md:flex-row" style={{ minHeight: '600px' }}>
          <div className="flex w-full flex-col md:w-72 md:flex-shrink-0">
            <VehicleList
              clientId={selectedLicense.clientId}
              selectedTokenId={selectedTokenId}
              onSelectVehicle={setSelectedTokenId}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <VehicleData clientId={selectedLicense.clientId} tokenId={selectedTokenId} />
          </div>
        </div>
      )}
    </>
  );
};

export const ExplorerView = ({ initialTokenId }: { initialTokenId?: number } = {}) => {
  const { loading, error } = useValidDeveloperLicenses();
  return (
    <div className="flex flex-col gap-6">
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage="There was a problem fetching your Developer Licenses"
      >
        <ExplorerContent initialTokenId={initialTokenId} />
      </QueryPageWrapper>
    </div>
  );
};
