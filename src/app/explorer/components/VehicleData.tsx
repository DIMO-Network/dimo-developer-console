'use client';

import React, { FC } from 'react';
import { useVehicleData } from '@/hooks/useVehicleData';
import { Loader } from '@/components/Loader';
import { WarningAmberIcon } from '@/components/Icons';

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
    // Object keys are dimmed against the value they label; every value stays
    // in the code block's own text color (no default Tailwind hues per value type).
    const cls = token.endsWith(':') ? 'text-muted' : 'text-fg';
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
      <div className="flex h-full items-center justify-center rounded-card bg-card p-8 text-body-sm text-muted">
        Select a vehicle to view its data.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-card bg-card p-6">
      <p className="text-card-title text-ink">Vehicle data — Token #{tokenId}</p>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader isLoading />
        </div>
      )}

      {missingDevJwt && (
        <p className="flex items-start gap-2 text-body-sm text-fg">
          <WarningAmberIcon className="mt-0.5 size-4 flex-shrink-0 text-warning" />
          No developer JWT found for this license. Generate one in the Developer License
          details.
        </p>
      )}

      {error && <p className="text-body-sm text-negative">{error}</p>}

      {!loading && !error && !missingDevJwt && availableSignals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-label text-muted">
            Available signals ({availableSignals.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSignals.map((signal) => (
              <span
                key={signal}
                className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && !missingDevJwt && latestSignalsError && (
        <div className="flex items-start gap-2 rounded-control border border-warning/40 bg-warning/10 px-3 py-2">
          <span className="mt-px text-body-sm leading-none text-warning">⚠</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-label font-medium text-fg">Latest signals unavailable</p>
            <p className="text-label text-muted">{latestSignalsError}</p>
          </div>
        </div>
      )}

      {!loading && !error && !missingDevJwt && latestSignals.length > 0 && (
        <div className="flex min-h-0 flex-col gap-2">
          <p className="text-label text-muted">Latest signals ({latestSignals.length})</p>
          <pre className="h-96 overflow-auto whitespace-pre rounded-control bg-control p-4 font-mono text-code leading-relaxed text-fg">
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
        <div className="flex flex-1 items-center justify-center text-body-sm text-muted">
          No signals available for this vehicle.
        </div>
      )}
    </div>
  );
};
