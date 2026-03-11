'use client';
import { FC, useContext, useState } from 'react';
import { Button } from '@/components/Button';
import { NotificationContext } from '@/context/notificationContext';
import { useMintVehicle } from '@/hooks';
import { MAKES, YEARS, VehicleMake } from './constants';

interface MintedVehicle {
  tokenId: number;
  make: string;
  model: string;
  year: number;
}

interface Props {
  clientId: `0x${string}`;
}

export const VehicleSimulator: FC<Props> = ({ clientId }) => {
  const { setNotification } = useContext(NotificationContext);
  const mintVehicle = useMintVehicle();

  const [selectedMakeSlug, setSelectedMakeSlug] = useState('');
  const [selectedModelSlug, setSelectedModelSlug] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mintedVehicles, setMintedVehicles] = useState<MintedVehicle[]>([]);

  const selectedMake: VehicleMake | undefined = MAKES.find(
    (m) => m.slug === selectedMakeSlug,
  );
  const canMint = !!selectedMakeSlug && !!selectedModelSlug && !!selectedYear;

  const handleMakeChange = (makeSlug: string) => {
    setSelectedMakeSlug(makeSlug);
    setSelectedModelSlug('');
  };

  const handleMint = async () => {
    if (!selectedMake || !selectedModelSlug || !selectedYear) return;
    try {
      setIsLoading(true);
      const result = await mintVehicle({
        manufacturerNodeId: selectedMake.nodeId,
        makeSlug: selectedMake.slug,
        modelSlug: selectedModelSlug,
        year: Number(selectedYear),
        clientId,
      });

      if (!result.success) {
        setNotification(result.reason ?? 'Minting failed', 'Error', 'error');
        return;
      }

      const modelLabel =
        selectedMake.models.find((m) => m.slug === selectedModelSlug)?.label ??
        selectedModelSlug;

      setMintedVehicles((prev) => [
        ...prev,
        {
          tokenId: result.tokenId ?? 0,
          make: selectedMake.label,
          model: modelLabel,
          year: Number(selectedYear),
        },
      ]);

      setNotification('Vehicle minted successfully!', 'Success', 'success');
    } catch {
      setNotification(
        'Something went wrong while minting the vehicle',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="license-list-content">
      <div className="description">
        <p className="title">Vehicle Simulator</p>
        <p className="text-sm text-text-secondary">
          Mint a simulated test vehicle on Polygon Amoy for development and testing.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-sm">
        {/* Make */}
        <div className="flex flex-col gap-1">
          <label htmlFor="sim-make" className="text-sm font-medium">
            Make
          </label>
          <select
            id="sim-make"
            aria-label="Make"
            className="rounded-lg border border-surface-stroke bg-surface-raised px-3 py-2 text-sm"
            value={selectedMakeSlug}
            disabled={isLoading}
            onChange={(e) => handleMakeChange(e.target.value)}
          >
            <option value="">Select make</option>
            {MAKES.map((make) => (
              <option key={make.slug} value={make.slug}>
                {make.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1">
          <label htmlFor="sim-model" className="text-sm font-medium">
            Model
          </label>
          <select
            id="sim-model"
            aria-label="Model"
            className="rounded-lg border border-surface-stroke bg-surface-raised px-3 py-2 text-sm disabled:opacity-50"
            value={selectedModelSlug}
            disabled={!selectedMakeSlug || isLoading}
            onChange={(e) => setSelectedModelSlug(e.target.value)}
          >
            <option value="">Select model</option>
            {selectedMake?.models.map((model) => (
              <option key={model.slug} value={model.slug}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1">
          <label htmlFor="sim-year" className="text-sm font-medium">
            Year
          </label>
          <select
            id="sim-year"
            aria-label="Year"
            className="rounded-lg border border-surface-stroke bg-surface-raised px-3 py-2 text-sm disabled:opacity-50"
            value={selectedYear}
            disabled={isLoading}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">Select year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="white !h-10"
          disabled={!canMint}
          loading={isLoading}
          onClick={handleMint}
        >
          Create a simulated vehicle
        </Button>
      </div>

      {/* Minted vehicles list */}
      {mintedVehicles.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          <p className="text-sm font-medium">Simulated Vehicles</p>
          <div className="flex flex-col gap-2">
            {mintedVehicles.map((vehicle, idx) => (
              <div
                key={idx}
                className="flex flex-row items-center justify-between rounded-lg border border-surface-stroke bg-surface-raised px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </span>
                <span className="text-text-secondary">Token ID: {vehicle.tokenId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
