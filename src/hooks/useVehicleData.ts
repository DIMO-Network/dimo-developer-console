'use client';

import { useState, useEffect } from 'react';
import { DIMO } from '@dimo-network/data-sdk';
import { getDevJwt } from '@/utils/devJwt';

const dimo = new DIMO('Production');

const TELEMETRY_URL = 'https://telemetry-api.dimo.zone/query';

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (dimo.tokenexchange as any).getVehicleJwt({
          headers: { Authorization: `Bearer ${devJwt}` },
          tokenId,
        });
        const vehicleAuthHeader: string = result.headers.Authorization;

        // Step 2: Query available signals from telemetry API
        const response = await fetch(TELEMETRY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': vehicleAuthHeader,
          },
          body: JSON.stringify({
            query: `query GetAvailable { availableSignals(tokenId: ${tokenId}) }`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Telemetry API responded with ${response.status}`);
        }

        const json = await response.json();
        if (json.errors?.length) {
          throw new Error(json.errors[0]?.message ?? 'GraphQL error');
        }

        if (!cancelled) {
          setState({
            availableSignals: json.data?.availableSignals ?? [],
            loading: false,
            error: null,
            missingDevJwt: false,
          });
        }
      } catch (err) {
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
