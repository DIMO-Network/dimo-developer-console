import { PaymentSACD, VehiclePermissionSACD } from '@/types/wallet';
import config from '@/config';
import useGlobalAccount from '@/hooks/useGlobalAccount';
import { getSessionTurnkeyClient } from '@/services/turnkey';
import { getKernelClient } from '@/services/zerodev';
import { formatSimpleBalanceWithDigits } from '@/utils/formatBalance';
import { isValidAddress } from '@ethereumjs/util';

export const useSACD = () => {
  const { validateCurrentSession } = useGlobalAccount();

  const generateSACDTemplate = ({
    amount,
    paymentLinkUrl,
    grantee,
    targetWallet,
    email,
    name,
  }: {
    amount: number;
    paymentLinkUrl: string;
    grantee: `0x${string}`;
    targetWallet?: `0x${string}` | null;
    email: string;
    name: string;
  }): PaymentSACD => {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const now = new Date(Date.now());

    const granteeAdditionalInfo: Record<string, unknown> = {
      email: email,
    };

    if (targetWallet && isValidAddress(targetWallet)) {
      granteeAdditionalInfo.beneficiary = targetWallet;
    }

    const sacd: PaymentSACD = {
      specVersion: '1.0',
      time: now.toISOString(),
      type: 'dimo.sacd',
      data: {
        grantor: {
          address: config.DIMO_ESCROW_ADDRESS,
          name: 'DIMO',
          additionalInfo: {},
        },
        grantee: {
          address: grantee,
          name: name,
          additionalInfo: granteeAdditionalInfo,
        },
        effectiveAt: now.toISOString(),
        expiresAt: fiveMinutesFromNow.toISOString(),
        additionalDates: {},
        agreements: [
          {
            type: 'payment',
            asset: 'did:fiat:USD',
            payment: {
              amount: formatSimpleBalanceWithDigits(amount, 2),
              recurrence: 'one-time',
              terms: {
                initialPayment: formatSimpleBalanceWithDigits(amount, 2),
                paymentMethod: 'direct transfer',
              },
            },
            purpose: 'Dimo Developer Credits purchase',
            attachments: [
              {
                name: 'Dimo Credits Purchase',
                description: 'Purchase of DCX',
                contentType: 'application/json',
                uri: paymentLinkUrl,
              },
            ],
            extensions: {
              invoicing: {
                invoiceFrequency: 'one-time',
                invoiceRecipient: email,
              },
            },
          },
        ],
      },
      signature: `0x${'0'.repeat(130)}`, // Placeholder for signature
    };

    return sacd;
  };

  const uploadSACD = async (
    sacd: PaymentSACD,
  ): Promise<{ success: boolean; cid: string }> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_IPFS_URL}`, {
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

  const signSACD = async (sacd: PaymentSACD): Promise<PaymentSACD> => {
    const currentUser = await validateCurrentSession();

    if (!currentUser) return {} as PaymentSACD;
    const { subOrganizationId, walletAddress } = currentUser;

    const turnkeyClient = getSessionTurnkeyClient();

    if (!turnkeyClient) return {} as PaymentSACD;

    const kernelClient = await getKernelClient({
      subOrganizationId,
      walletAddress: walletAddress,
      client: turnkeyClient,
    });

    if (!kernelClient) return {} as PaymentSACD;

    const sacdStr = JSON.stringify(sacd, null, 2);

    const signed = await kernelClient.account.signMessage({
      message: sacdStr,
    });

    sacd.signature = signed;

    return sacd;
  };

  const ALL_PERMISSION_NAMES = [
    'GetNonLocationHistory',
    'ExecuteCommands',
    'GetCurrentLocation',
    'GetLocationHistory',
    'GetVINCredential',
    'GetLiveData',
    'GetRawData',
    'GetApproximateLocation',
  ] as const;

  const generateVehiclePermissionSACD = ({
    grantee,
    grantor,
    asset,
    expiration,
  }: {
    grantee: `0x${string}`;
    grantor: `0x${string}`;
    asset: string;
    expiration: bigint;
  }): VehiclePermissionSACD => {
    const now = new Date();
    return {
      specVersion: '1.0',
      time: now.toISOString(),
      type: 'dimo.sacd',
      dataversion: 'sacd/v1.0',
      data: {
        grantor: { address: grantor },
        grantee: { address: grantee },
        effectiveAt: now.toISOString(),
        expiresAt: new Date(Number(expiration) * 1000).toISOString(),
        additionalDates: {},
        agreements: [
          {
            type: 'permission',
            asset,
            permissions: ALL_PERMISSION_NAMES.map((name) => ({
              name: `privilege:${name}`,
            })),
            attachments: [],
            extensions: {},
          },
        ],
      },
      signature: '0x',
    };
  };

  const signAndUploadPermissionSACD = async ({
    grantee,
    grantor,
    asset,
    expiration,
  }: {
    grantee: `0x${string}`;
    grantor: `0x${string}`;
    asset: string;
    expiration: bigint;
  }): Promise<string> => {
    const sacd = generateVehiclePermissionSACD({ grantee, grantor, asset, expiration });

    const currentUser = await validateCurrentSession();
    if (!currentUser) throw new Error('No active session for SACD signing');

    const { subOrganizationId, walletAddress } = currentUser;
    const turnkeyClient = getSessionTurnkeyClient();
    if (!turnkeyClient) throw new Error('No Turnkey client for SACD signing');

    const kernelClient = await getKernelClient({
      subOrganizationId,
      walletAddress,
      client: turnkeyClient,
    });
    if (!kernelClient) throw new Error('No kernel client for SACD signing');

    // Sign with the placeholder signature in place, matching dimo-login behavior
    sacd.signature = await kernelClient.account.signMessage({
      message: JSON.stringify(sacd),
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_IPFS_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sacd),
    });
    if (!response.ok) throw new Error('Failed to upload vehicle permission SACD to IPFS');

    const { cid } = await response.json();
    return `ipfs://${cid}`;
  };

  return {
    generateSACDTemplate,
    uploadSACD,
    signSACD,
    signAndUploadPermissionSACD,
  };
};
