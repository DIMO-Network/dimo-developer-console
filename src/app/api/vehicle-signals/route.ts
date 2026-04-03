import { NextRequest, NextResponse } from 'next/server';
import { DIMO } from '@dimo-network/data-sdk';

const dimo = new DIMO('Production');

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const telemetryResult = await (dimo.telemetry as any).query({
      headers: { Authorization: vehicleAuthHeader },
      query: `query GetAvailable { availableSignals(tokenId: ${tokenId}) }`,
    });

    if (telemetryResult.errors?.length) {
      throw new Error(telemetryResult.errors[0]?.message ?? 'GraphQL error');
    }

    return NextResponse.json({
      availableSignals: telemetryResult.data?.availableSignals ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch vehicle data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
