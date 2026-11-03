export interface Notice {
  tone: 'success' | 'warning' | 'error';
  message: string;
}

/** What to tell the user once a mint has landed on-chain. */
export const mintNotice = ({
  tokenId,
  recorded,
  registered,
  shared,
}: {
  tokenId: number;
  recorded: boolean;
  registered: boolean;
  /**
   * The vehicle's permissions were granted to the simulator and to this license. That is
   * one user operation, so false means neither of them has it.
   */
  shared: boolean;
}): Notice => {
  if (!recorded) {
    return {
      tone: 'error',
      message: `Vehicle #${tokenId} was minted, but it couldn't be saved to this license.`,
    };
  }
  // Only one test vehicle is allowed and this one holds the slot, so a vehicle nobody
  // was granted can't be replaced without removing it first.
  if (!shared) {
    return {
      tone: 'warning',
      message: `Vehicle #${tokenId} was minted, but neither the simulator nor this license was granted access to it. Remove the vehicle and mint again to fix this.`,
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
