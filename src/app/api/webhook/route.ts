import { NextRequest, NextResponse } from 'next/server';
import { mintDimoCredits } from '@/services/smartContract';

// POST request handler
export async function POST(req: NextRequest) {
  let txHash = '';
  try {
    const { status, txHash: incomingTxHash } = await req.json();
    txHash = incomingTxHash;
    if (status === 'PAY_SUCCESS') {
      await mintDimoCredits(txHash);
      return NextResponse.json({ message: 'Tokens burned successfully.' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Invalid payment status.' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error handling webhook for txHash ${txHash}:`, error);
    return NextResponse.json({ message: 'Error processing webhook.' }, { status: 500 });
  }
}
