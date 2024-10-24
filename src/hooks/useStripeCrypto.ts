import { useState } from 'react';
import { loadStripeOnramp } from '@stripe/crypto/pure';

export const useStripeCrypto = () => {
  const [stripeClientId, setStripeClientId] = useState<string | null>(null);

  const loadStripeOnRamp = async () => {
    return await loadStripeOnramp(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  };

  const createStripeCryptoSession = async (wallet: `0x${string}`, amount: number): Promise<{ client_secret: string; }> => {
    const params = new URLSearchParams();
    params.append('wallet_addresses[polygon]', wallet);
    params.append('source_amount', amount.toString());
    params.append('source_currency', 'usd');
    params.append('destination_networks[]', 'polygon');
    params.append('destination_currencies[]', 'matic');
    params.append('destination_network', 'polygon');
    params.append('destination_currency', 'matic');

    const response = await fetch(process.env.NEXT_PUBLIC_STRIPE_ONRAMP_API!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRIPE_API_KEY!}`
      },
      body: params,
    });

    return response.json();
  };

  return {
    stripeClientId,
    setStripeClientId,
    createStripeCryptoSession,
    loadStripeOnRamp
  };
};

export default useStripeCrypto;