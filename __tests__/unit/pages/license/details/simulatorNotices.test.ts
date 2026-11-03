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
      mintNotice({ tokenId: 7, recorded: true, registered: false, shared: true }).tone,
    ).toBe('warning');
  });

  it("warns when the license wasn't granted", () => {
    expect(
      mintNotice({ tokenId: 7, recorded: true, registered: true, shared: false }),
    ).toEqual({
      tone: 'warning',
      message: expect.stringContaining('#7'),
    });
  });

  it('names both problems when the simulator and the grant both failed', () => {
    const { tone, message } = mintNotice({
      tokenId: 7,
      recorded: true,
      registered: false,
      shared: false,
    });
    expect(tone).toBe('warning');
    expect(message).toContain("simulator couldn't start");
    expect(message).toContain("couldn't be shared with this license");
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
