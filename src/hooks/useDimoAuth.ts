'use client';
import { getSessionTurnkeyClient } from '@/services/turnkey';
import { useGlobalAccount } from '@/hooks';
import { saveDevJwt } from '@/utils/devJwt';
import { getDeveloperJwt } from '@/services/dimoDev';
import { decryptExportBundle, generateP256KeyPair } from '@turnkey/crypto';

export const useDimoAuth = () => {
  const { validateCurrentSession } = useGlobalAccount();

  const hasGlobalAccountPrivateKey = async (): Promise<{
    hasPrivateKey: boolean;
    privateKeyAddress: `0x${string}` | null;
  }> => {
    const currentSession = await validateCurrentSession();

    if (!currentSession) {
      return {
        hasPrivateKey: false,
        privateKeyAddress: null,
      };
    }

    const client = getSessionTurnkeyClient();
    if (!client) {
      return {
        hasPrivateKey: false,
        privateKeyAddress: null,
      };
    }
    const { subOrganizationId } = currentSession;

    const { privateKeys } = await client.getPrivateKeys({
      organizationId: subOrganizationId,
    });

    if (privateKeys.length > 0)
      return {
        hasPrivateKey: true,
        privateKeyAddress: privateKeys[0].addresses![0].address! as `0x${string}`,
      };

    const { activity: privateKeyActivity } = await client.createPrivateKeys({
      type: 'ACTIVITY_TYPE_CREATE_PRIVATE_KEYS_V2',
      timestampMs: Date.now().toString(),
      organizationId: subOrganizationId,
      parameters: {
        privateKeys: [
          {
            privateKeyName: 'Dev-Console',
            privateKeyTags: [],
            addressFormats: ['ADDRESS_FORMAT_ETHEREUM'],
            curve: 'CURVE_SECP256K1',
          },
        ],
      },
    });

    const newPrivateKeys =
      privateKeyActivity.result.createPrivateKeysResultV2!.privateKeys;

    if (!newPrivateKeys)
      return {
        hasPrivateKey: false,
        privateKeyAddress: null,
      };

    const privateKey = newPrivateKeys[0];

    return {
      hasPrivateKey: true,
      privateKeyAddress: privateKey.addresses![0].address! as `0x${string}`,
    };
  };

  const getPrivateKeyId = async ({
    subOrganizationId,
  }: {
    subOrganizationId: string;
  }) => {
    const client = getSessionTurnkeyClient();

    if (!client) return null;

    const { privateKeys } = await client.getPrivateKeys({
      organizationId: subOrganizationId,
    });

    return privateKeys[0].privateKeyId;
  };

  const getPrivateKey = async () => {
    const currentSession = await validateCurrentSession();

    if (!currentSession) {
      return null;
    }

    const client = getSessionTurnkeyClient();
    if (!client) {
      return null;
    }

    const { subOrganizationId } = currentSession;

    const privateKeyId = await getPrivateKeyId({ subOrganizationId });

    const key = generateP256KeyPair();
    const targetPublicKey = key.publicKeyUncompressed;

    const { activity } = await client.exportPrivateKey({
      type: 'ACTIVITY_TYPE_EXPORT_PRIVATE_KEY',
      timestampMs: Date.now().toString(),
      organizationId: subOrganizationId,
      parameters: {
        privateKeyId: privateKeyId!,
        targetPublicKey: targetPublicKey,
      },
    });

    const { exportBundle } = activity.result.exportPrivateKeyResult!;

    const privateKey = await decryptExportBundle({
      exportBundle: exportBundle,
      embeddedKey: key.privateKey,
      organizationId: subOrganizationId,
      returnMnemonic: false,
    });
    return privateKey!;
  };

  const getGlobalAccountDeveloperJwt = async ({
    clientId,
    domain,
  }: {
    clientId: `0x${string}`;
    domain: string;
  }): Promise<boolean> => {
    const currentSession = await validateCurrentSession();

    if (!currentSession) {
      return false;
    }

    const client = getSessionTurnkeyClient();
    if (!client) {
      return false;
    }

    const privateKey = await getPrivateKey();

    const { headers } = await getDeveloperJwt({
      client_id: clientId,
      domain: domain,
      private_key: privateKey!,
    });

    if (!headers) {
      return false;
    }

    const { Authorization } = headers;

    const token = Authorization.split(' ')[1];

    saveDevJwt(clientId, token);

    return true;
  };

  return {
    getGlobalAccountDeveloperJwt,
    hasGlobalAccountPrivateKey,
  };
};

export default useDimoAuth;
