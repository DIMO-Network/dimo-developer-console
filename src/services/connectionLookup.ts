import configuration from '@/config';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

export interface MintedConnection {
  owner: string;
  tokenId: string;
}

/**
 * Who holds a connection name on chain, or null if nobody does. Throws when Identity
 * can't say: a caller deciding whether to mint must not read that as "nobody".
 */
export const findConnectionByName = async (
  name: string,
): Promise<MintedConnection | null> => {
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
  // Identity answers an unknown name with NOT_FOUND, alongside a null connection.
  // Any other error, or no data at all, means it couldn't say.
  if (!data || errors.some((error) => error.extensions?.code !== 'NOT_FOUND')) {
    throw new Error('Identity API could not answer');
  }
  return data.connection ?? null;
};
