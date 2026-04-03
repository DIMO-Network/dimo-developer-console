'use client';

import { useState, useEffect } from 'react';
import { getDevJwt } from '@/utils/devJwt';

// Lazy singleton — only instantiated on first actual use (client-side), never at module eval time
let _dimo: InstanceType<typeof import('@dimo-network/data-sdk').DIMO> | null = null;
const getDimo = async () => {
  if (!_dimo) {
    const { DIMO } = await import('@dimo-network/data-sdk');
    _dimo = new DIMO('Production');
  }
  return _dimo;
};

export interface VehicleDataState {
  availableSignals: string[];
  loading: boolean;
  error: string | null;
  missingDevJwt: boolean;
}

export const useVehicleData = (
  clientId: string | undefined,
  tokenId: number | null,
): VehicleDataState => {
  const [state, setState] = useState<VehicleDataState>({
    availableSignals: [],
    loading: false,
    error: null,
    missingDevJwt: false,
  });

  useEffect(() => {
    if (!clientId || tokenId === null) {
      setState({
        availableSignals: [],
        loading: false,
        error: null,
        missingDevJwt: false,
      });
      return;
    }

    const devJwt = getDevJwt(clientId);
    if (!devJwt) {
      setState({
        availableSignals: [],
        loading: false,
        error: null,
        missingDevJwt: true,
      });
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setState({
        availableSignals: [],
        loading: true,
        error: null,
        missingDevJwt: false,
      });
      try {
        // Step 1: Exchange developer JWT for a vehicle-scoped JWT
        console.log('[useVehicleData] fetching vehicle JWT for tokenId', tokenId);
        const dimo = await getDimo();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (dimo.tokenexchange as any).getVehicleJwt({
          headers: { Authorization: `Bearer ${devJwt}` },
          tokenId,
        });
        console.log('[useVehicleData] vehicle JWT result:', result);
        const vehicleAuthHeader: string = result.headers.Authorization;

        // Step 2: Query available signals via data-sdk telemetry
        console.log('[useVehicleData] querying availableSignals');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const telemetryResult = await (dimo.telemetry as any).query({
          headers: { Authorization: vehicleAuthHeader },
          query: `query GetAvailable { availableSignals(tokenId: ${tokenId}) }`,
        });
        console.log('[useVehicleData] telemetry result:', telemetryResult);

        if (telemetryResult.errors?.length) {
          throw new Error(telemetryResult.errors[0]?.message ?? 'GraphQL error');
        }

        if (!cancelled) {
          setState({
            availableSignals: telemetryResult.data?.availableSignals ?? [],
            loading: false,
            error: null,
            missingDevJwt: false,
          });
        }
      } catch (err) {
        console.error('[useVehicleData] error:', err);
        if (!cancelled) {
          setState({
            availableSignals: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch vehicle data',
            missingDevJwt: false,
          });
        }
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [clientId, tokenId]);

  return state;
};
