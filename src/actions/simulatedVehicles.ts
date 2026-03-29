'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import configuration from '@/config';

export interface SimulatedVehicle {
  id: string;
  user_id: string;
  token_id: number;
  make: string;
  model: string;
  year: number;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export const getSimulatedVehicles = async ({
  clientId,
}: {
  clientId: string;
}): Promise<SimulatedVehicle[]> => {
  try {
    const client = await dimoDevAPIClient();
    const { data } = await client.get<{ data: SimulatedVehicle[] }>(
      `/api/my/simulated-vehicles?clientId=${clientId}`,
    );
    return data.data;
  } catch {
    return [];
  }
};

export const recordSimulatedVehicle = async ({
  tokenId,
  make,
  model,
  year,
  clientId,
}: {
  tokenId: number;
  make: string;
  model: string;
  year: number;
  clientId: string;
}): Promise<SimulatedVehicle> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<{ data: SimulatedVehicle }>(
    `/api/my/simulated-vehicles`,
    {
      token_id: tokenId,
      make,
      model,
      year,
      client_id: clientId,
    },
  );
  return data.data;
};

export const deleteSimulatedVehicle = async ({
  vehicleId,
}: {
  vehicleId: string;
}): Promise<void> => {
  const client = await dimoDevAPIClient();
  await client.delete(`/api/my/simulated-vehicles/${vehicleId}`);
};

export const deregisterVehicleFromSimulator = async ({
  tokenId,
}: {
  tokenId: number;
}): Promise<{ token_id: number; status: string }> => {
  try {
    const response = await fetch(
      `${configuration.VEHICLE_SIMULATOR_URL}/api/vehicles/${tokenId}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '(unreadable)');
      console.error(
        `Simulator deregister failed: ${response.status} ${response.statusText}`,
        {
          tokenId,
          url: `${configuration.VEHICLE_SIMULATOR_URL}/api/vehicles/${tokenId}`,
          body,
        },
      );
      return { token_id: tokenId, status: 'deregister_failed' };
    }

    return response.json();
  } catch (e) {
    console.error('Simulator deregister error:', e);
    return { token_id: tokenId, status: 'deregister_failed' };
  }
};

export const registerVehicleWithSimulator = async ({
  tokenId,
  ownerWalletAddress,
}: {
  tokenId: number;
  ownerWalletAddress: string;
}): Promise<{ token_id: number; status: string }> => {
  try {
    const response = await fetch(
      `${configuration.VEHICLE_SIMULATOR_URL}/api/vehicles/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: tokenId,
          owner_wallet_address: ownerWalletAddress,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '(unreadable)');
      console.error(
        `Simulator registration failed: ${response.status} ${response.statusText}`,
        {
          tokenId,
          ownerWalletAddress,
          url: `${configuration.VEHICLE_SIMULATOR_URL}/api/vehicles/register`,
          body,
        },
      );
      return { token_id: tokenId, status: 'registration_failed' };
    }

    return response.json();
  } catch (e) {
    console.error('Simulator registration error:', e);
    return { token_id: tokenId, status: 'registration_failed' };
  }
};
