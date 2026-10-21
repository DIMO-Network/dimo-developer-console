import {
  askForAccess,
  DATA_ACCESS_UNAVAILABLE,
  formatList,
  grantWarning,
  leaveConfirm,
  NO_LONGER_HAS_ACCESS,
  removedFromTeam,
  signerLocked,
} from '@/config/teamCopy';

describe('team copy (contracts C8)', () => {
  it('words the grant warning exactly, DCX sentence included', () => {
    expect(grantWarning('Sam Rivera', 'Harness Fleet')).toBe(
      "Data access lets Sam Rivera use every permission vehicles have granted Harness Fleet, including commands, through the DIMO APIs — not only what the console shows. Their queries spend Harness Fleet's DCX credits.",
    );
  });

  it('words every other C8 sentence exactly', () => {
    expect(askForAccess('ops@acme.dev', 'Harness Fleet')).toBe(
      'Ask ops@acme.dev for data access to Harness Fleet.',
    );
    expect(NO_LONGER_HAS_ACCESS).toBe('You no longer have access to this license.');
    expect(DATA_ACCESS_UNAVAILABLE).toBe(
      "Data access for team members isn't available yet.",
    );
    expect(removedFromTeam('Acme Mobility')).toBe(
      "You're no longer a member of Acme Mobility.",
    );
    expect(signerLocked('ops@acme.dev')).toBe(
      'Your access is tied to another wallet. Ask ops@acme.dev to revoke it first.',
    );
    expect(leaveConfirm('Acme Mobility', 'ops@acme.dev')).toBe(
      'Leave Acme Mobility? ops@acme.dev will be asked to revoke your data access.',
    );
  });

  it('joins license names in prose', () => {
    expect(formatList(['A'])).toBe('A');
    expect(formatList(['A', 'B'])).toBe('A and B');
    expect(formatList(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
