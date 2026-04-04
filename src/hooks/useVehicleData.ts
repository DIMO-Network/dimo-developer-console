'use client';

import { useState, useEffect } from 'react';
import { getDevJwt } from '@/utils/devJwt';
import type { LatestSignal } from '@/app/api/vehicle-signals/route';

export type { LatestSignal };

export interface VehicleDataState {
  availableSignals: string[];
  latestSignals: LatestSignal[];
  latestSignalsError: string | null;
  loading: boolean;
  error: string | null;
  missingDevJwt: boolean;
}

const EMPTY: VehicleDataState = {
  availableSignals: [],
  latestSignals: [],
  latestSignalsError: null,
  loading: false,
  error: null,
  missingDevJwt: false,
};

export const useVehicleData = (
  clientId: string | undefined,
  tokenId: number | null,
): VehicleDataState => {
  const [state, setState] = useState<VehicleDataState>(EMPTY);

  useEffect(() => {
    if (!clientId || tokenId === null) {
      setState(EMPTY);
      return;
    }

    const devJwt = getDevJwt(clientId);
    if (!devJwt) {
      setState({ ...EMPTY, missingDevJwt: true });
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setState({ ...EMPTY, loading: true });
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
            latestSignalsError: json.latestSignalsError ?? null,
            loading: false,
            error: null,
            missingDevJwt: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            ...EMPTY,
            error: err instanceof Error ? err.message : 'Failed to fetch vehicle data',
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
