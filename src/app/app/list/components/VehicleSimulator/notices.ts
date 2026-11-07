export interface Notice {
  tone: 'success' | 'warning' | 'error';
  /** Message key in the `app` namespace; callers translate it with `values`. */
  key: string;
  values?: Record<string, number>;
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
    return { tone: 'error', key: 'simulator.notices.notRecorded', values: { tokenId } };
  }
  // Only one test vehicle is allowed and this one holds the slot, so a vehicle nobody
  // was granted can't be replaced without removing it first.
  if (!shared) {
    return { tone: 'warning', key: 'simulator.notices.notShared', values: { tokenId } };
  }
  if (!registered) {
    return {
      tone: 'warning',
      key: 'simulator.notices.notRegistered',
      values: { tokenId },
    };
  }
  return { tone: 'success', key: 'simulator.notices.minted' };
};

/** Cleanup runs even when the burn fails, so the two outcomes need saying apart. */
export const removalNotice = (burned: boolean): Notice =>
  burned
    ? { tone: 'success', key: 'simulator.notices.removed' }
    : { tone: 'warning', key: 'simulator.notices.removedNotBurned' };
