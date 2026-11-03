import { NextRequest, NextResponse } from 'next/server';

import { getCreditConsumptionByLicense } from '@/services/creditTracker';
import { PRIVATE_HEADERS } from '@/utils/routeResponses';

const LICENSE_ID = /^0x[0-9a-fA-F]{40}$/;

// A license's credit usage over the last month. As a server action it queued
// every other action behind a tracker that takes 3.5-10 s; as a GET with a 3 s
// timeout the page stops waiting. The dev JWT arrives in a header (never the
// URL) and the failure body never carries it.
export const GET = async (request: NextRequest) => {
  const licenseId = request.nextUrl.searchParams.get('licenseId');
  const devJwt = request.headers.get('X-Developer-Jwt');
  if (!licenseId || !LICENSE_ID.test(licenseId) || !devJwt) {
    return NextResponse.json(
      { message: 'A license id and developer JWT are required' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setMonth(fromDate.getMonth() - 1);

  try {
    const usage = await getCreditConsumptionByLicense({
      licenseId: licenseId as `0x${string}`,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      devJwt,
    });
    return NextResponse.json(usage, { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json(
      { message: 'Credit usage unavailable' },
      { status: 502, headers: PRIVATE_HEADERS },
    );
  }
};
