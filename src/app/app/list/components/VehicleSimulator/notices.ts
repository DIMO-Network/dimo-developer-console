export interface Notice {
  tone: 'success' | 'warning' | 'error';
  message: string;
}

/** What to tell the user once a mint has landed on-chain. */
export const mintNotice = ({
  tokenId,
  recorded,
  registered,
}: {
  tokenId: number;
  recorded: boolean;
  registered: boolean;
}): Notice => {
  if (!recorded) {
    return {
      tone: 'error',
      message: `Vehicle #${tokenId} was minted, but it couldn't be saved to this license.`,
    };
  }
  if (!registered) {
    return {
      tone: 'warning',
      message: `Vehicle #${tokenId} was minted, but the simulator couldn't start it.`,
    };
  }
  return { tone: 'success', message: 'Vehicle minted successfully!' };
};

/** Cleanup runs even when the burn fails, so the two outcomes need saying apart. */
export const removalNotice = (burned: boolean): Notice =>
  burned
    ? { tone: 'success', message: 'Vehicle removed successfully' }
    : {
        tone: 'warning',
        message: 'Vehicle removed from the simulator, but its NFT could not be burned.',
      };
