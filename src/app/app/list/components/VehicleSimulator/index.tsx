'use client';
import { FC, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Abi } from 'viem';
import { Button } from '@/components/Button';
import { NotificationContext } from '@/context/notificationContext';
import { useMintVehicle, useBurnVehicle, useGlobalAccount } from '@/hooks';
import {
  getSimulatedVehicles,
  recordSimulatedVehicle,
  registerVehicleWithSimulator,
  deleteSimulatedVehicle,
  deregisterVehicleFromSimulator,
} from '@/actions/simulatedVehicles';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getPublicClient } from '@/services/zerodev';
import DimoVehicleIdABI from '@/contracts/DimoVehicleIdABI.json';
import configuration from '@/config';
import { MAKES, VehicleMake, buildDeviceDefinitionId } from './constants';
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
  const burnVehicle = useBurnVehicle();
  const { currentUser } = useGlobalAccount();
  const queryClient = useQueryClient();

  const [selectedMakeSlug, setSelectedMakeSlug] = useState('');
  const [selectedModelSlug, setSelectedModelSlug] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: storedVehicles = [] } = useQuery({
    queryKey: ['simulated-vehicles', clientId],
    queryFn: () => getSimulatedVehicles({ clientId }),
  });

  const { data: removedOnChain = new Set<number>() } = useQuery({
    queryKey: ['vehicle-on-chain-status', storedVehicles.map((v) => v.token_id)],
    enabled: storedVehicles.length > 0,
    queryFn: async () => {
      const publicClient = getPublicClient();
      const results = await Promise.all(
        storedVehicles.map((v) =>
          publicClient
            .readContract({
              address: configuration.VEHICLE_NFT_ADDRESS,
              abi: DimoVehicleIdABI as Abi,
              functionName: 'exists',
              args: [BigInt(v.token_id)],
            })
            .then((exists) => ({ tokenId: v.token_id, exists: exists as boolean }))
            .catch(() => ({ tokenId: v.token_id, exists: false })),
        ),
      );
      return new Set(results.filter((r) => !r.exists).map((r) => r.tokenId));
    },
  });

  const atLimit = storedVehicles.length >= MAX_TEST_VEHICLES;

  const selectedMake: VehicleMake | undefined = MAKES.find(
    (m) => m.slug === selectedMakeSlug,
  );
  const selectedModel = selectedMake?.models.find((m) => m.slug === selectedModelSlug);
  const availableYears = selectedModel?.years ?? [];
  const canMint = !!selectedMakeSlug && !!selectedModelSlug && !!selectedYear && !atLimit;

  const handleMakeChange = (makeSlug: string) => {
    setSelectedMakeSlug(makeSlug);
    setSelectedModelSlug('');
    setSelectedYear('');
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

  const handleDelete = async (vehicleId: string, tokenId: number) => {
    try {
      setDeletingId(vehicleId);

      console.log('[VehicleSimulator] Burning vehicle on-chain', { tokenId });
      const burnResult = await burnVehicle({ tokenId });
      console.log('[VehicleSimulator] Burn result', burnResult);

      if (!burnResult.success) {
        console.warn('[VehicleSimulator] Burn failed — proceeding with cleanup anyway', {
          reason: burnResult.reason,
        });
      }

      console.log('[VehicleSimulator] Deregistering vehicle from simulator', { tokenId });
      const deregResult = await deregisterVehicleFromSimulator({ tokenId });
      console.log('[VehicleSimulator] Simulator deregister result', deregResult);

      console.log('[VehicleSimulator] Deleting simulated vehicle record', { vehicleId });
      const deleteResult = await deleteSimulatedVehicle({ vehicleId });
      if (!deleteResult.success) {
        console.warn('[VehicleSimulator] Delete record failed', {
          vehicleId,
          status: deleteResult.status,
          message: deleteResult.message,
        });
        setNotification(
          deleteResult.message ?? 'Failed to remove vehicle record',
          'Error',
          'error',
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['simulated-vehicles', clientId] });
      console.log('[VehicleSimulator] Vehicle removed', { vehicleId, tokenId });
      setNotification('Vehicle removed successfully', 'Success', 'success');
    } catch (e) {
      console.error('[VehicleSimulator] Delete error', e);
      setNotification(
        e instanceof Error ? e.message : 'Failed to remove vehicle',
        'Error',
        'error',
      );
    } finally {
      setDeletingId(null);
    }
  };

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

      console.log('[VehicleSimulator] Minting vehicle', {
        make: selectedMake.label,
        model: modelLabel,
        year: selectedYear,
        manufacturerNodeId: selectedMake.nodeId,
        deviceDefinitionId,
        clientId,
      });

      const result = await mintVehicle({
        manufacturerNodeId: selectedMake.nodeId,
        deviceDefinitionId,
        make: selectedMake.label,
        model: modelLabel,
        year: Number(selectedYear),
      });

      console.log('[VehicleSimulator] mintVehicle result', result);

      if (!result.success) {
        console.warn('[VehicleSimulator] Mint failed', { reason: result.reason });
        setNotification(result.reason ?? 'Minting failed', 'Error', 'error');
        return;
      }

      if (result.tokenId === null) {
        console.error(
          '[VehicleSimulator] Mint succeeded but tokenId is null — VehicleNodeMinted event not found in logs',
          {
            logs: result.logs,
          },
        );
        setNotification(
          'Mint succeeded but vehicle token ID could not be read. Please try again.',
          'Error',
          'error',
        );
        return;
      }

      console.log('[VehicleSimulator] Recording simulated vehicle', {
        tokenId: result.tokenId,
        make: selectedMake.label,
        model: modelLabel,
        year: Number(selectedYear),
        clientId,
      });

      const recordResult = await recordSimulatedVehicle({
        tokenId: result.tokenId ?? 0,
        make: selectedMake.label,
        model: modelLabel,
        year: Number(selectedYear),
        clientId,
      });

      if (!recordResult.success) {
        console.warn('[VehicleSimulator] Failed to record vehicle', recordResult);
      }

      console.log('[VehicleSimulator] Registering vehicle with simulator', {
        tokenId: result.tokenId,
        ownerWalletAddress: currentUser!.smartContractAddress,
      });

      const registration = await registerVehicleWithSimulator({
        tokenId: result.tokenId ?? 0,
        ownerWalletAddress: currentUser!.smartContractAddress,
      });

      console.log('[VehicleSimulator] Simulator registration result', registration);

      await queryClient.invalidateQueries({ queryKey: ['simulated-vehicles', clientId] });

      console.log('[VehicleSimulator] Mint complete — tokenId', result.tokenId);
      setNotification('Vehicle minted successfully!', 'Success', 'success');
    } catch (e) {
      console.error('[VehicleSimulator] Mint error', e);
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
          <p className="text-sm text-text-secondary">Mint simulated test vehicles.</p>
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
            {availableYears.map((year) => (
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
            {storedVehicles.map((vehicle) => {
              const isRemovedOnChain = removedOnChain.has(vehicle.token_id);
              return (
                <div
                  key={vehicle.id}
                  className={`vehicle-sim-card${isRemovedOnChain ? ' vehicle-sim-card--stale' : ''}`}
                >
                  <div className="vehicle-sim-card-left">
                    <span className="vehicle-sim-card-vehicle">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                    {isRemovedOnChain ? (
                      <span className="vehicle-sim-card-stale-badge">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        Removed on-chain
                      </span>
                    ) : (
                      <span className="vehicle-sim-card-network">Polygon</span>
                    )}
                  </div>
                  <div className="vehicle-sim-card-right">
                    <span className="vehicle-sim-card-token-label">Token ID</span>
                    <span className="vehicle-sim-card-token-id">#{vehicle.token_id}</span>
                    <button
                      type="button"
                      aria-label="Remove vehicle"
                      disabled={deletingId === vehicle.id}
                      onClick={() => handleDelete(vehicle.id, vehicle.token_id)}
                      className="vehicle-sim-delete-btn"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
