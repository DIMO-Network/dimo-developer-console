'use client';

import React, { FC } from 'react';
import { useVehicleData } from '@/hooks/useVehicleData';
import { Loader } from '@/components/Loader';

interface Props {
  clientId: string;
  tokenId: number | null;
}

function colorizeJson(json: string): React.ReactNode[] {
  // Matches: "key": (object key), "string" (value), true/false, null, numbers
  const tokenRegex =
    /("(?:\\.|[^"\\])*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(json)) !== null) {
    if (match.index > last) {
      parts.push(json.slice(last, match.index));
    }
    const token = match[0];
    let cls: string;
    if (token.endsWith(':')) {
      cls = 'text-blue-400'; // object key
    } else if (token.startsWith('"')) {
      cls = 'text-green-400'; // string value
    } else if (token === 'true' || token === 'false') {
      cls = 'text-yellow-400';
    } else if (token === 'null') {
      cls = 'text-text-secondary';
    } else {
      cls = 'text-orange-400'; // number
    }
    parts.push(
      <span key={match.index} className={cls}>
        {token}
      </span>,
    );
    last = match.index + token.length;
  }

  if (last < json.length) {
    parts.push(json.slice(last));
  }
  return parts;
}

function ColoredJson({ data }: { data: unknown }) {
  return <>{colorizeJson(JSON.stringify(data, null, 2))}</>;
}

export const VehicleData: FC<Props> = ({ clientId, tokenId }) => {
  const {
    availableSignals,
    latestSignals,
    latestSignalsError,
    loading,
    error,
    missingDevJwt,
  } = useVehicleData(clientId, tokenId);

  if (tokenId === null) {
    return (
      <div className="flex items-center justify-center h-full bg-card rounded-xl p-8 text-text-secondary text-sm">
        Select a vehicle to view its data.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-card rounded-xl p-6 h-full overflow-y-auto">
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
                className="text-xs font-mono px-2 py-1 rounded bg-accent text-text-primary border border-border"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && !missingDevJwt && latestSignalsError && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2">
          <span className="text-yellow-400 text-sm leading-none mt-px">⚠</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-yellow-400">
              Latest signals unavailable
            </p>
            <p className="text-xs text-yellow-400/70">{latestSignalsError}</p>
          </div>
        </div>
      )}

      {!loading && !error && !missingDevJwt && latestSignals.length > 0 && (
        <div className="flex flex-col gap-2 min-h-0">
          <p className="text-xs text-text-secondary">
            Latest Signals ({latestSignals.length})
          </p>
          <pre className="text-xs font-mono bg-accent border border-border rounded-lg p-4 overflow-auto h-96 whitespace-pre leading-relaxed">
            <ColoredJson
              data={Object.fromEntries(
                latestSignals.map(({ signal, timestamp, value }) => [
                  signal,
                  { timestamp, value },
                ]),
              )}
            />
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
