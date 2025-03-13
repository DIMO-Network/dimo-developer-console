import { ApiKeyStamper } from '@turnkey/sdk-browser';
import { turnkeyConfig } from '@/config/turnkey';
import { getFromLocalStorage, EmbeddedKey } from '@/utils/localStorage';
import { TurnkeyClient } from '@turnkey/http';
import {
  generateP256KeyPair,
  decryptCredentialBundle,
  getPublicKey,
} from '@turnkey/crypto';
import { uint8ArrayToHexString, uint8ArrayFromHexString } from '@turnkey/encoding';

export const getTurnkeyClient = (authKey: string): TurnkeyClient => {
  const ekey = getFromLocalStorage<string>(EmbeddedKey);
  console.info('ekey', ekey);
  const privateKey = decryptCredentialBundle(authKey, ekey!);
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

export const getTurnkeyWallet = async ({
  authKey,
  subOrganizationId,
}: {
  authKey: string;
  subOrganizationId: string;
}) => {
  const client = getTurnkeyClient(authKey);
  const { wallets } = await client.getWallets({
    organizationId: subOrganizationId,
  });
  const { account } = await client.getWalletAccount({
    organizationId: subOrganizationId,
    walletId: wallets[0].walletId,
  });

  return account.address;
};
