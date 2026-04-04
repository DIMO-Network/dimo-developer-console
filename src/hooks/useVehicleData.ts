'use client';

import { useState, useEffect } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import type { LatestSignal } from '@/app/api/vehicle-signals/route';

export type { LatestSignal };

export interface VehicleDataState {
  availableSignals: string[];
  latestSignals: LatestSignal[];
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
    latestSignals: [],
    loading: false,
    error: null,
    missingDevJwt: false,
  });

  useEffect(() => {
    if (!clientId || tokenId === null) {
      setState({
        availableSignals: [],
        latestSignals: [],
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
        latestSignals: [],
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
        latestSignals: [],
        loading: true,
        error: null,
        missingDevJwt: false,
      });
      try {
        const res = await fetch('/api/vehicle-signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId, devJwt }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? 'Failed to fetch vehicle data');
        }
        if (!cancelled) {
          setState({
            availableSignals: json.availableSignals ?? [],
            latestSignals: json.latestSignals ?? [],
            loading: false,
            error: null,
            missingDevJwt: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            availableSignals: [],
            latestSignals: [],
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
