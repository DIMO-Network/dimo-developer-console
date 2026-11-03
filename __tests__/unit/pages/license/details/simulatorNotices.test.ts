import {
  mintNotice,
  removalNotice,
} from '@/app/app/list/components/VehicleSimulator/notices';

describe('mintNotice', () => {
  it('reports a vehicle that is saved and running as a success', () => {
    expect(
      mintNotice({ tokenId: 7, recorded: true, registered: true, shared: true }),
    ).toEqual({
      tone: 'success',
      message: 'Vehicle minted successfully!',
    });
  });

  it('reports an error when the license has no record of the vehicle', () => {
    expect(
      mintNotice({ tokenId: 7, recorded: false, registered: false, shared: true }),
    ).toEqual({
      tone: 'error',
      message: expect.stringContaining('#7'),
    });
  });

  it('warns when the simulator did not take the vehicle', () => {
    expect(
      mintNotice({ tokenId: 7, recorded: true, registered: false, shared: true }),
    ).toEqual({
      tone: 'warning',
      message: "Vehicle #7 was minted, but the simulator couldn't start it.",
    });
  });

  // The grant to the simulator and to the license is one user operation, and the one
  // test vehicle holds the only slot: the user has to remove it before minting again.
  it('says neither the simulator nor the license was granted, and how to fix it', () => {
    expect(
      mintNotice({ tokenId: 7, recorded: true, registered: true, shared: false }),
    ).toEqual({
      tone: 'warning',
      message:
        'Vehicle #7 was minted, but neither the simulator nor this license was granted access to it. Remove the vehicle and mint again to fix this.',
    });
  });

  it('says it once when the simulator did not start either, as one grant covers both', () => {
    const { tone, message } = mintNotice({
      tokenId: 7,
      recorded: true,
      registered: false,
      shared: false,
    });
    expect(tone).toBe('warning');
    expect(message).toContain('neither the simulator nor this license was granted');
    expect(message).toContain('Remove the vehicle and mint again');
    expect(message).not.toContain("couldn't start");
    expect(message).not.toContain("won't be listed");
  });
});

describe('removalNotice', () => {
  it('reports a burned vehicle as removed', () => {
    expect(removalNotice(true)).toEqual({
      tone: 'success',
      message: 'Vehicle removed successfully',
    });
  });

  it('does not claim the NFT is gone when the burn failed', () => {
    expect(removalNotice(false)).toEqual({
      tone: 'warning',
      message: expect.stringContaining('could not be burned'),
    });
  });
});
