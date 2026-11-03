import { type Abi, stringToHex } from 'viem';
import configuration from '@/config';
import DimoConnectionABI from '@/contracts/DimoConnectionABI.json';
import { getPublicClient } from '@/services/zerodev';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export interface MintedConnection {
  owner: string;
  tokenId: string;
}

const askIdentity = async (name: string): Promise<MintedConnection | null> => {
  const res = await fetchWithTimeout(
    configuration.identityApiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'query ConnectionByName($name: String!) { connection(by: { name: $name }) { owner tokenId } }',
        variables: { name },
      }),
    },
    { label: 'identity-api' },
  );
  if (!res.ok) throw new Error(`Identity API answered ${res.status}`);

  const { data, errors = [] } = (await res.json()) as {
    data?: { connection?: MintedConnection | null } | null;
    errors?: { extensions?: { code?: string } }[];
  };
  // Identity answers an unknown name with NOT_FOUND, alongside a null connection, and
  // only that means it doesn't know the name. A caller may spend $1 on this answer, so
  // any other shape counts as Identity not being able to say.
  if (errors.length === 0 && data?.connection) return data.connection;
  const isNotFound =
    errors.length > 0 &&
    errors.every((error) => error.extensions?.code === 'NOT_FOUND') &&
    data?.connection === null;
  if (isNotFound) return null;
  throw new Error('Identity API could not answer');
};

// The contract's id for a name is uint256(bytes32(bytes(name))): its UTF-8 bytes,
// right-padded to 32. `exists` first, because ownerOf reverts on an unknown id.
const askChain = async (name: string): Promise<MintedConnection | null> => {
  const tokenId = BigInt(stringToHex(name, { size: 32 }));
  const contract = {
    address: configuration.DCC_ADDRESS,
    abi: DimoConnectionABI as Abi,
    args: [tokenId],
  };
  const client = getPublicClient();

  const exists = await client.readContract({ ...contract, functionName: 'exists' });
  if (!exists) return null;

  const owner = await client.readContract({ ...contract, functionName: 'ownerOf' });
  return { owner: owner as string, tokenId: tokenId.toString() };
};

/**
 * Who holds a connection name, or null if nobody does. Identity indexes after the
 * chain, so its "not found" can be a mint it hasn't seen yet: the chain has the last
 * word. Throws when either can't say: a caller deciding whether to mint must not read
 * that as "nobody".
 */
export const findMintedConnection = async (
  name: string,
): Promise<MintedConnection | null> =>
  (await askIdentity(name)) ?? (await askChain(name));
