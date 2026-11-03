import { ApiKeyStamper } from '@turnkey/sdk-server';
import { turnkeyConfig } from '@/config/turnkey';
import { TurnkeyClient } from '@turnkey/http';
import { decryptCredentialBundle, getPublicKey } from '@turnkey/crypto';
import { uint8ArrayToHexString, uint8ArrayFromHexString } from '@turnkey/encoding';
import { isLive, readSession } from '@/utils/globalAccountSession';

export const getTurnkeyClient = ({
  authKey,
  eKey,
}: {
  authKey: string;
  eKey: string;
}): TurnkeyClient => {
  const privateKey = decryptCredentialBundle(authKey, eKey);
  const publicKey = uint8ArrayToHexString(
    getPublicKey(uint8ArrayFromHexString(privateKey), true),
  );

  return new TurnkeyClient(
    {
      baseUrl: turnkeyConfig.apiBaseUrl,
    },
    new ApiKeyStamper({
      apiPublicKey: publicKey,
      apiPrivateKey: privateKey,
    }),
  );
};

// The bundle and the key it was encrypted to come from one read of the shared
// session, made now: a sign-in in another tab replaces both together.
export const getSessionTurnkeyClient = (): TurnkeyClient | null => {
  const session = readSession();
  if (!isLive(session)) return null;
  return getTurnkeyClient({ authKey: session.token, eKey: session.eKey });
};

export const getTurnkeyWalletAddress = async ({
  subOrganizationId,
  client,
}: {
  subOrganizationId: string;
  client: TurnkeyClient;
}): Promise<`0x${string}`> => {
  const { wallets } = await client.getWallets({
    organizationId: subOrganizationId,
  });
  const { account } = await client.getWalletAccount({
    organizationId: subOrganizationId,
    walletId: wallets[0].walletId,
  });

  return account.address as `0x${string}`;
};
