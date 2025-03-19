import { ApiKeyStamper } from '@turnkey/sdk-server';
import { turnkeyConfig } from '@/config/turnkey';
import { getFromLocalStorage, EmbeddedKey } from '@/utils/localStorage';
import { TurnkeyClient } from '@turnkey/http';
import { decryptCredentialBundle, getPublicKey } from '@turnkey/crypto';
import { uint8ArrayToHexString, uint8ArrayFromHexString } from '@turnkey/encoding';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';
import { IGlobalAccountSession } from '@/types/wallet';

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

export const getSessionTurnkeyClient = (): TurnkeyClient | null => {
  const eKey = getFromLocalStorage<string>(EmbeddedKey);
  const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);

  if (!eKey || !session) {
    return null;
  }

  const { token } = session;

  return getTurnkeyClient({ authKey: token, eKey });
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
