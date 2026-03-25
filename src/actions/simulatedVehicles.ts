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
  const client = await dimoDevAPIClient();
  const { data } = await client.get<{ data: SimulatedVehicle[] }>(
    `/api/my/simulated-vehicles?clientId=${clientId}`,
  );
  return data.data;
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

export const registerVehicleWithSimulator = async ({
  tokenId,
  ownerWalletAddress,
}: {
  tokenId: number;
  ownerWalletAddress: string;
}): Promise<{ token_id: number; status: string }> => {
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
    throw new Error(`Simulator registration failed: ${response.statusText}`);
  }

  return response.json();
};
