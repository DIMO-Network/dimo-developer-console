'use client';
import { mintNotice, removalNotice } from './notices';
import { FC, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Abi } from 'viem';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useMintVehicle } from '@/hooks/useMintVehicle';
import { useBurnVehicle } from '@/hooks/useBurnVehicle';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import {
  recordSimulatedVehicle,
  registerVehicleWithSimulator,
  deleteSimulatedVehicle,
  deregisterVehicleFromSimulator,
} from '@/actions/simulatedVehicles';
import type { SimulatedVehicle } from '@/actions/simulatedVehicles';
import { fetchJson } from '@/utils/fetchJson';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { BubbleLoader } from '@/components/BubbleLoader';
import { getPublicClient } from '@/services/zerodev';
import DimoVehicleIdABI from '@/contracts/DimoVehicleIdABI.json';
import configuration from '@/config';
import {
  MAKES,
  SIMULATOR_GRANTEE,
  VehicleMake,
  buildDeviceDefinitionId,
} from './constants';
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
  const t = useTranslations('app');
  const mintVehicle = useMintVehicle();
  const burnVehicle = useBurnVehicle();
  const { currentUser } = useGlobalAccount();
  const queryClient = useQueryClient();

  const [selectedRegion, setSelectedRegion] = useState<'usa' | 'japan' | ''>('');
  const [selectedMakeSlug, setSelectedMakeSlug] = useState('');
  const [selectedModelSlug, setSelectedModelSlug] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: storedVehicles = [] } = useQuery({
    queryKey: ['simulated-vehicles', clientId],
    queryFn: () =>
      fetchJson<SimulatedVehicle[]>(
        `/api/simulated-vehicles?clientId=${encodeURIComponent(clientId)}`,
      ),
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
  const routeFile =
    selectedRegion === 'japan' ? 'src/routes/japan_honshu_circuit.json' : undefined;

  const canMint =
    !!selectedRegion &&
    !!selectedMakeSlug &&
    !!selectedModelSlug &&
    !!selectedYear &&
    !atLimit;

  const handleMakeChange = (makeSlug: string) => {
    setSelectedMakeSlug(makeSlug);
    setSelectedModelSlug('');
    setSelectedYear('');
  };

  const selectionPreview = (() => {
    if (!selectedRegion) return t('simulator.noVehicle');
    const regionLabel = t(`simulator.regions.${selectedRegion}.label`);
    if (!selectedMakeSlug) return regionLabel;
    const makeName = selectedMake?.label ?? selectedMakeSlug;
    const modelLabel =
      selectedMake?.models.find((m) => m.slug === selectedModelSlug)?.label ??
      selectedModelSlug;
    const parts = [regionLabel, selectedYear, makeName, modelLabel].filter(Boolean);
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
      if (!deleteResult.success && deleteResult.status !== 404) {
        console.warn('[VehicleSimulator] Delete record failed', {
          vehicleId,
          status: deleteResult.status,
          message: deleteResult.message,
        });
        toast.error(deleteResult.message ?? t('simulator.removeRecordFailed'));
        return;
      }
      if (deleteResult.status === 404) {
        console.warn(
          '[VehicleSimulator] Delete record returned 404 — treating as already removed',
          { vehicleId },
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['simulated-vehicles', clientId] });
      console.log('[VehicleSimulator] Vehicle removed', { vehicleId, tokenId });
      const removal = removalNotice(burnResult.success);
      toast[removal.tone](t(removal.key));
    } catch (e) {
      console.error('[VehicleSimulator] Delete error', e);
      toast.error(e instanceof Error ? e.message : t('simulator.removeFailed'));
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
        powertrainType: selectedModel!.powertrainType,
        sacdGrantees: [SIMULATOR_GRANTEE, clientId],
      });

      console.log('[VehicleSimulator] mintVehicle result', result);

      if (!result.success) {
        console.warn('[VehicleSimulator] Mint failed', { reason: result.reason });
        toast.error(result.reason ?? t('simulator.mintFailed'));
        return;
      }

      if (result.tokenId === null) {
        console.error(
          '[VehicleSimulator] Mint succeeded but tokenId is null — VehicleNodeMinted event not found in logs',
          {
            logs: result.logs,
          },
        );
        toast.error(t('simulator.mintTokenUnreadable'));
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
        // Without the record there's no row to remove the vehicle from later.
        console.warn('[VehicleSimulator] Failed to record vehicle', recordResult);
        const notice = mintNotice({
          tokenId: result.tokenId,
          recorded: false,
          registered: false,
          shared: !result.sacdFailed,
        });
        toast[notice.tone](t(notice.key, notice.values));
        return;
      }

      console.log('[VehicleSimulator] Registering vehicle with simulator', {
        tokenId: result.tokenId,
        ownerWalletAddress: currentUser!.smartContractAddress,
      });

      const registration = await registerVehicleWithSimulator({
        tokenId: result.tokenId ?? 0,
        ownerWalletAddress: currentUser!.smartContractAddress,
        make: selectedMake.label,
        model: modelLabel,
        year: Number(selectedYear),
        routeFile,
      });

      console.log('[VehicleSimulator] Simulator registration result', registration);

      await queryClient.invalidateQueries({ queryKey: ['simulated-vehicles', clientId] });

      console.log('[VehicleSimulator] Mint complete — tokenId', result.tokenId);
      const notice = mintNotice({
        tokenId: result.tokenId,
        recorded: true,
        registered: registration.status !== 'registration_failed',
        shared: !result.sacdFailed,
      });
      toast[notice.tone](t(notice.key, notice.values));
    } catch (e) {
      console.error('[VehicleSimulator] Mint error', e);
      toast.error(e instanceof Error ? e.message : t('simulator.mintError'));
    } finally {
      setIsLoading(false);
    }
  };

  const isBusy = isLoading || deletingId !== null;
  const busyLabel = isLoading ? t('simulator.minting') : t('simulator.removing');

  return (
    <div className="license-list-content w-full relative">
      {isBusy && (
        <div className="vehicle-sim-overlay" aria-live="polite" aria-label={busyLabel}>
          <BubbleLoader isLoading />
          <span className="vehicle-sim-overlay-label">{busyLabel}</span>
        </div>
      )}

      {/* Header */}
      <div className="vehicle-sim-header">
        <div className="vehicle-sim-header-text">
          <p className="title">{t('simulator.title')}</p>
          <p className="text-body-sm text-muted">{t('simulator.subtitle')}</p>
        </div>
      </div>

      {/* Step-by-step configurator */}
      <div className="vehicle-sim-steps">
        {/* Step 01 — Region */}
        <div className="vehicle-sim-step">
          <span className="vehicle-sim-step-label">{t('simulator.steps.region')}</span>
          <div
            className="vehicle-sim-pill-group"
            role="group"
            aria-label={t('simulator.selectRegion')}
          >
            {(['usa', 'japan'] as const).map((region) => (
              <button
                key={region}
                type="button"
                aria-pressed={selectedRegion === region}
                aria-label={t(`simulator.regions.${region}.label`)}
                disabled={isLoading}
                onClick={() => setSelectedRegion(region)}
                className={`vehicle-sim-region-card${selectedRegion === region ? ' selected' : ''}`}
              >
                <span className="vehicle-sim-region-label">
                  {t(`simulator.regions.${region}.label`)}
                </span>
                <span className="vehicle-sim-region-sub">
                  {t(`simulator.regions.${region}.sub`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 02 — Make */}
        <div className={`vehicle-sim-step${!selectedRegion ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">{t('simulator.steps.make')}</span>
          <div
            className="vehicle-sim-make-grid"
            role="group"
            aria-label={t('simulator.selectMake')}
          >
            {MAKES.map((make) => (
              <button
                key={make.slug}
                type="button"
                aria-pressed={selectedMakeSlug === make.slug}
                aria-label={make.label}
                disabled={!selectedRegion || isLoading}
                onClick={() => handleMakeChange(make.slug)}
                className={`vehicle-sim-make-card${selectedMakeSlug === make.slug ? ' selected' : ''}`}
              >
                <MakeIcon path={make.siPath} />
                <span className="vehicle-sim-make-name">{make.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 03 — Model */}
        <div className={`vehicle-sim-step${!selectedMakeSlug ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">{t('simulator.steps.model')}</span>
          <div
            className="vehicle-sim-pill-group"
            role="group"
            aria-label={t('simulator.selectModel')}
          >
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
                {t('simulator.selectMakeFirst')}
              </span>
            )}
          </div>
        </div>

        {/* Step 04 — Year */}
        <div className={`vehicle-sim-step${!selectedModelSlug ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">{t('simulator.steps.year')}</span>
          <div
            className="vehicle-sim-pill-group"
            role="group"
            aria-label={t('simulator.selectYear')}
          >
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
            ? t('simulator.limitReached', { max: MAX_TEST_VEHICLES })
            : selectionPreview}
        </span>
        <Button
          className="h-9! shrink-0"
          disabled={!canMint}
          loading={isLoading}
          onClick={handleMint}
        >
          {t('simulator.mint')}
        </Button>
      </div>

      {/* Simulated fleet */}
      {storedVehicles.length > 0 && (
        <div className="vehicle-sim-fleet">
          <div className="vehicle-sim-fleet-header">
            <span className="vehicle-sim-step-label">{t('simulator.fleet.title')}</span>
            <span className="vehicle-sim-fleet-count">
              {t('simulator.fleet.count', { count: storedVehicles.length })}
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
                        {t('simulator.fleet.removedOnChain')}
                      </span>
                    ) : (
                      <span className="vehicle-sim-card-network">Polygon</span>
                    )}
                  </div>
                  <div className="vehicle-sim-card-right">
                    <span className="vehicle-sim-card-token-label">
                      {t('simulator.fleet.tokenId')}
                    </span>
                    <span className="vehicle-sim-card-token-id">#{vehicle.token_id}</span>
                    <button
                      type="button"
                      aria-label={t('simulator.fleet.remove')}
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
