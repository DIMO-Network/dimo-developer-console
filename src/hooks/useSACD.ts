import { PaymentSACD } from '@/types/wallet';
import config from '@/config';

export const useSACD = () => {
  const generateSACDTemplate = ({
    amount,
    paymentLinkUrl,
    smartContractAddress,
    email,
    name,
  }: {
    amount: number;
    paymentLinkUrl: string;
    smartContractAddress: `0x${string}`;
    email: string;
    name: string;
  }): PaymentSACD => {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const now = new Date(Date.now());
    const dcxDid: string = `did:erc20:${config.CONTRACT_NETWORK}:${config.DCX_ADDRESS}`;

    const sacd: PaymentSACD = {
      specVersion: '1.0',
      timestamp: now.toISOString(),
      type: 'dimo.sacd',
      data: {
        grantor: {
          address: config.DIMO_ESCROW_ADDRESS,
          name: 'Dimo',
          additionalInfo: {},
        },
        grantee: {
          address: smartContractAddress,
          name: name,
          additionalInfo: {
            email: email,
          },
        },
        expiresAt: fiveMinutesFromNow.toISOString(),
        agreements: [
          {
            type: 'payment',
            asset: dcxDid,
            payment: {
              amount: amount,
              recurrence: 'one-time',
              terms: {
                initialPayment: 0,
                paymentMethod: 'direct transfer',
              },
            },
            purpose: 'Dimo Developer Credits purchase',
            attachments: [
              {
                name: 'Dimo Credits Purchase',
                description: 'Purchase of DCX',
                contentType: 'application/json',
                url: paymentLinkUrl,
              },
            ],
            signatures: [],
          },
        ],
      },
      extensions: {
        invoicing: {
          invoiceFrequency: 'one-time',
          invoiceRecipient: email,
        },
      },
    };

    return sacd;
  };

  const uploadSACD = async (
    sacd: PaymentSACD,
  ): Promise<{ success: boolean; cid: string }> => {
    const response = await fetch(``, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sacd),
    });

    if (!response.ok) {
      throw new Error('Failed to upload SACD');
    }

    const data = await response.json();
    return data;
  };

  return {
    generateSACDTemplate,
    uploadSACD,
  };
};
