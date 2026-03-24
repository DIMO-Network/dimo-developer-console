'use client';
import { FC, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { NotificationContext } from '@/context/notificationContext';
import { useMintVehicle } from '@/hooks';
import {
  getSimulatedVehicles,
  recordSimulatedVehicle,
} from '@/actions/simulatedVehicles';
import { MAKES, YEARS, VehicleMake, buildDeviceDefinitionId } from './constants';
import './VehicleSimulator.css';

const MAX_TEST_VEHICLES = 1;

interface Props {
  clientId: `0x${string}`;
}

const MakeIcon: FC<{ path: string }> = ({ path }) => (
  <svg className="vehicle-sim-make-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d={path} fill="currentColor" />
  </svg>
);

export const VehicleSimulator: FC<Props> = ({ clientId }) => {
  const { setNotification } = useContext(NotificationContext);
  const mintVehicle = useMintVehicle();
  const queryClient = useQueryClient();

  const [selectedMakeSlug, setSelectedMakeSlug] = useState('');
  const [selectedModelSlug, setSelectedModelSlug] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: storedVehicles = [] } = useQuery({
    queryKey: ['simulated-vehicles', clientId],
    queryFn: () => getSimulatedVehicles({ clientId }),
  });

  const atLimit = storedVehicles.length >= MAX_TEST_VEHICLES;

  const selectedMake: VehicleMake | undefined = MAKES.find(
    (m) => m.slug === selectedMakeSlug,
  );
  const canMint = !!selectedMakeSlug && !!selectedModelSlug && !!selectedYear && !atLimit;

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

      const modelLabel =
        selectedMake.models.find((m) => m.slug === selectedModelSlug)?.label ??
        selectedModelSlug;

      const deviceDefinitionId = buildDeviceDefinitionId(
        selectedMake.slug,
        selectedModelSlug,
        Number(selectedYear),
      );

      const result = await mintVehicle({
        manufacturerNodeId: selectedMake.nodeId,
        deviceDefinitionId,
      });

      if (!result.success) {
        setNotification(result.reason ?? 'Minting failed', 'Error', 'error');
        return;
      }

      await recordSimulatedVehicle({
        tokenId: result.tokenId ?? 0,
        make: selectedMake.label,
        model: modelLabel,
        year: Number(selectedYear),
        clientId,
      });

      await queryClient.invalidateQueries({ queryKey: ['simulated-vehicles', clientId] });

      setNotification('Vehicle minted successfully!', 'Success', 'success');
    } catch (e) {
      setNotification(
        e instanceof Error ? e.message : 'Something went wrong while minting the vehicle',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="license-list-content w-full">
      {/* Header */}
      <div className="vehicle-sim-header">
        <div className="vehicle-sim-header-text">
          <p className="title">Vehicle Simulator</p>
          <p className="text-sm text-text-secondary">
            Mint simulated test vehicles on Polygon Amoy.
          </p>
        </div>
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
                <MakeIcon path={make.siPath} />
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
          {atLimit
            ? `Limit reached — only ${MAX_TEST_VEHICLES} test vehicle per account`
            : selectionPreview}
        </span>
        <Button
          className="white !h-9 shrink-0"
          disabled={!canMint}
          loading={isLoading}
          onClick={handleMint}
        >
          Mint Vehicle
        </Button>
      </div>

      {/* Simulated fleet */}
      {storedVehicles.length > 0 && (
        <div className="vehicle-sim-fleet">
          <div className="vehicle-sim-fleet-header">
            <span className="vehicle-sim-step-label">Simulated Fleet</span>
            <span className="vehicle-sim-fleet-count">
              {storedVehicles.length} vehicle{storedVehicles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="vehicle-sim-fleet-list">
            {storedVehicles.map((vehicle) => (
              <div key={vehicle.id} className="vehicle-sim-card">
                <div className="vehicle-sim-card-left">
                  <span className="vehicle-sim-card-vehicle">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                  <span className="vehicle-sim-card-network">Polygon Amoy</span>
                </div>
                <div className="vehicle-sim-card-right">
                  <span className="vehicle-sim-card-token-label">Token ID</span>
                  <span className="vehicle-sim-card-token-id">#{vehicle.token_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
