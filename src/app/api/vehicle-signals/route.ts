import { NextRequest, NextResponse } from 'next/server';
import { DIMO } from '@dimo-network/data-sdk';

const dimo = new DIMO('Production');

// Signals whose `value` field is an object rather than a scalar.
// All others are treated as scalars via `{ timestamp value }`.
const COMPLEX_VALUE_FIELDS: Record<string, string> = {
  currentLocationCoordinates: '{ latitude longitude hdop }',
};

function buildSignalsLatestQuery(tokenId: number, signals: string[]): string {
  const fields = signals
    .map((signal) => {
      const valueSubFields = COMPLEX_VALUE_FIELDS[signal];
      return valueSubFields
        ? `    ${signal} { timestamp value ${valueSubFields} }`
        : `    ${signal} { timestamp value }`;
    })
    .join('\n');

  return `query GetLatestSignals {
  signalsLatest(tokenId: ${tokenId}) {
    lastSeen
${fields}
  }
}`;
}

export interface LatestSignal {
  signal: string;
  timestamp: string;
  value: unknown;
}

export async function POST(req: NextRequest) {
  const { tokenId, devJwt } = (await req.json()) as {
    tokenId: number;
    devJwt: string;
  };

  if (!tokenId || !devJwt) {
    return NextResponse.json({ error: 'Missing tokenId or devJwt' }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleJwtResult = await (dimo.tokenexchange as any).getVehicleJwt({
      headers: { Authorization: `Bearer ${devJwt}` },
      tokenId,
    });
    const vehicleAuthHeader: string = vehicleJwtResult.headers.Authorization;

    // Step 1: available signals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableResult = await (dimo.telemetry as any).query({
      headers: { Authorization: vehicleAuthHeader },
      query: `query GetAvailable { availableSignals(tokenId: ${tokenId}) }`,
    });

    if (availableResult.errors?.length) {
      throw new Error(availableResult.errors[0]?.message ?? 'GraphQL error');
    }

    const availableSignals: string[] = availableResult.data?.availableSignals ?? [];

    // Step 2: latest values for all available signals
    let latestSignals: LatestSignal[] = [];
    let latestSignalsError: string | null = null;
    if (availableSignals.length > 0) {
      try {
        const query = buildSignalsLatestQuery(tokenId, availableSignals);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const latestResult = await (dimo.telemetry as any).query({
          headers: { Authorization: vehicleAuthHeader },
          query,
        });

        if (latestResult.errors?.length) {
          latestSignalsError = latestResult.errors[0]?.message ?? 'GraphQL error';
        } else {
          const raw = latestResult.data?.signalsLatest ?? {};
          latestSignals = availableSignals
            .map((signal) => {
              const entry = raw[signal];
              if (!entry) return null;
              return { signal, timestamp: entry.timestamp as string, value: entry.value };
            })
            .filter((s): s is LatestSignal => s !== null);
        }
      } catch (err) {
        latestSignalsError =
          err instanceof Error ? err.message : 'Failed to fetch latest signals';
      }
    }

    return NextResponse.json({ availableSignals, latestSignals, latestSignalsError });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch vehicle data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
