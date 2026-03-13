'use client';
import { FC, useContext, useState } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import { useMintVehicle } from '@/hooks';
import { MAKES, YEARS, VehicleMake } from './constants';
import './VehicleSimulator.css';

interface MintedVehicle {
  tokenId: number;
  make: string;
  model: string;
  year: number;
}

interface Props {
  clientId: `0x${string}`;
}

const MAKE_ABBRS: Record<string, string> = {
  toyota: 'TOY',
  ford: 'FORD',
  tesla: 'TSL',
  bmw: 'BMW',
  honda: 'HON',
};

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

  const selectionPreview = (() => {
    if (!selectedMakeSlug) return 'No vehicle configured';
    const makeName = selectedMake?.label ?? selectedMakeSlug;
    const modelLabel =
      selectedMake?.models.find((m) => m.slug === selectedModelSlug)?.label ??
      selectedModelSlug;
    const parts = [selectedYear, makeName, modelLabel].filter(Boolean);
    return parts.join(' · ');
  })();

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
      {/* Header */}
      <div className="vehicle-sim-header">
        <div className="vehicle-sim-header-text">
          <p className="title">Vehicle Simulator</p>
          <p className="text-sm text-text-secondary">
            Mint simulated test vehicles on Polygon Amoy.
          </p>
        </div>
        <span className="vehicle-sim-testnet-badge">Testnet</span>
      </div>

      {/* Step-by-step configurator */}
      <div className="vehicle-sim-steps">
        {/* Step 01 — Make */}
        <div className="vehicle-sim-step">
          <span className="vehicle-sim-step-label">01 — Make</span>
          <div className="vehicle-sim-make-grid" role="group" aria-label="Select make">
            {MAKES.map((make) => (
              <button
                key={make.slug}
                type="button"
                aria-pressed={selectedMakeSlug === make.slug}
                aria-label={make.label}
                disabled={isLoading}
                onClick={() => handleMakeChange(make.slug)}
                className={`vehicle-sim-make-card${selectedMakeSlug === make.slug ? ' selected' : ''}`}
              >
                <span className="vehicle-sim-make-abbr">
                  {MAKE_ABBRS[make.slug] ?? make.slug.slice(0, 4).toUpperCase()}
                </span>
                <span className="vehicle-sim-make-name">{make.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 02 — Model */}
        <div className={`vehicle-sim-step${!selectedMakeSlug ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">02 — Model</span>
          <div className="vehicle-sim-pill-group" role="group" aria-label="Select model">
            {(selectedMake?.models ?? []).map((model) => (
              <button
                key={model.slug}
                type="button"
                aria-pressed={selectedModelSlug === model.slug}
                aria-label={model.label}
                disabled={!selectedMakeSlug || isLoading}
                onClick={() => setSelectedModelSlug(model.slug)}
                className={`vehicle-sim-pill${selectedModelSlug === model.slug ? ' selected' : ''}`}
              >
                {model.label}
              </button>
            ))}
            {!selectedMake && (
              <span
                className="vehicle-sim-pill"
                style={{ opacity: 0.3, pointerEvents: 'none' }}
              >
                Select a make first
              </span>
            )}
          </div>
        </div>

        {/* Step 03 — Year */}
        <div className={`vehicle-sim-step${!selectedModelSlug ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">03 — Year</span>
          <div className="vehicle-sim-pill-group" role="group" aria-label="Select year">
            {YEARS.map((year) => (
              <button
                key={year}
                type="button"
                aria-pressed={selectedYear === String(year)}
                aria-label={String(year)}
                disabled={!selectedModelSlug || isLoading}
                onClick={() => setSelectedYear(String(year))}
                className={`vehicle-sim-pill${selectedYear === String(year) ? ' selected' : ''}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Divider + Mint action */}
      <div className="vehicle-sim-divider" />
      <div className="vehicle-sim-mint-row">
        <span className="vehicle-sim-selection-preview" aria-live="polite">
          {selectionPreview}
        </span>
        <button
          type="button"
          className="vehicle-sim-mint-btn"
          disabled={!canMint || isLoading}
          onClick={handleMint}
          aria-label="Mint simulated vehicle"
        >
          {isLoading ? (
            <>
              <span className="vehicle-sim-spinner" aria-hidden="true" />
              Minting…
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5" />
                <circle cx="18" cy="17" r="3" />
                <circle cx="8" cy="17" r="3" />
              </svg>
              Mint Vehicle
            </>
          )}
        </button>
      </div>

      {/* Simulated fleet */}
      {mintedVehicles.length > 0 && (
        <div className="vehicle-sim-fleet">
          <div className="vehicle-sim-fleet-header">
            <span className="vehicle-sim-step-label">Simulated Fleet</span>
            <span className="vehicle-sim-fleet-count">
              {mintedVehicles.length} vehicle{mintedVehicles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="vehicle-sim-fleet-list">
            {mintedVehicles.map((vehicle, idx) => (
              <div key={idx} className="vehicle-sim-card">
                <div className="vehicle-sim-card-left">
                  <span className="vehicle-sim-card-vehicle">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                  <span className="vehicle-sim-card-network">Polygon Amoy</span>
                </div>
                <div className="vehicle-sim-card-right">
                  <span className="vehicle-sim-card-token-label">Token ID</span>
                  <span className="vehicle-sim-card-token-id">#{vehicle.tokenId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
