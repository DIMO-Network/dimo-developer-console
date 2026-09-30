// DID helpers shared by the browser and the route handlers. Pure: no config, no I/O.

const ADDRESS = '0x[0-9a-fA-F]{40}';
const ERC721 = new RegExp(`^did:erc721:(\\d+):(${ADDRESS}):(\\d+)$`);
const ETHR = new RegExp(`^did:ethr:(\\d+):(${ADDRESS})$`);

export const parseErc721Did = (
  did: string,
): { chainId: number; contract: string; tokenId: number } | null => {
  const m = ERC721.exec(did);
  if (!m) return null;
  return { chainId: Number(m[1]), contract: m[2], tokenId: Number(m[3]) };
};

export const isEthrDid = (did: string): boolean => ETHR.test(did);

export const accountDid = (chainId: number, address: string) =>
  `did:ethr:${chainId}:${address}`;

// Telemetry's SignalFilter.source: the connection's ethr DID.
export const sourceDid = (chainId: number, address: string) =>
  `did:ethr:${chainId}:${address}`;

export const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

export const shortDid = (did: string) => {
  const erc = parseErc721Did(did);
  if (erc)
    return `did:erc721:${erc.chainId}:${shortAddress(erc.contract)}:${erc.tokenId}`;
  const m = ETHR.exec(did);
  if (m) return `did:ethr:${m[1]}:${shortAddress(m[2])}`;
  return did;
};
