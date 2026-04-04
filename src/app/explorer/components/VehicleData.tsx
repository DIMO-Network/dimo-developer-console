'use client';

import { FC } from 'react';
import { useVehicleData } from '@/hooks/useVehicleData';
import { Loader } from '@/components/Loader';

interface Props {
  clientId: string;
  tokenId: number | null;
}

export const VehicleData: FC<Props> = ({ clientId, tokenId }) => {
  const { availableSignals, latestSignals, loading, error, missingDevJwt } =
    useVehicleData(clientId, tokenId);

  if (tokenId === null) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-default rounded-xl p-8 text-text-secondary text-sm">
        Select a vehicle to view its data.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-default rounded-xl p-6 h-full overflow-y-auto">
      <p className="text-sm text-text-secondary font-medium uppercase tracking-wider">
        Vehicle Data — Token #{tokenId}
      </p>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader isLoading />
        </div>
      )}

      {missingDevJwt && (
        <p className="text-sm text-yellow-400">
          No developer JWT found for this license. Generate one in the Developer License
          details.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && !missingDevJwt && availableSignals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary">
            Available Signals ({availableSignals.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSignals.map((signal) => (
              <span
                key={signal}
                className="text-xs font-mono px-2 py-1 rounded bg-surface-raised text-text-primary border border-[#322D2F]"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && !missingDevJwt && latestSignals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary">
            Latest Signals ({latestSignals.length})
          </p>
          <pre className="text-xs font-mono bg-surface-raised border border-[#322D2F] rounded-lg p-4 overflow-auto whitespace-pre text-text-primary leading-relaxed">
            {JSON.stringify(
              Object.fromEntries(
                latestSignals.map(({ signal, timestamp, value }) => [
                  signal,
                  { timestamp, value },
                ]),
              ),
              null,
              2,
            )}
          </pre>
        </div>
      )}

      {!loading && !error && !missingDevJwt && availableSignals.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          No signals available for this vehicle.
        </div>
      )}
    </div>
  );
};
