import { NextRequest, NextResponse } from 'next/server';
import { burnDimoTokens } from '@/services/smartContract';

// POST request handler
export async function POST(req: NextRequest) {
  try {
    const { status, txHash } = await req.json(); // Parsing JSON from the request body

    if (status === 'PAY_SUCCESS') {
      // Call the burn DIMO token function if the payment was successful
      await burnDimoTokens(txHash);
      return NextResponse.json({ message: 'Tokens burned successfully.' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Invalid payment status.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ message: 'Error processing webhook.' }, { status: 500 });
  }
}
