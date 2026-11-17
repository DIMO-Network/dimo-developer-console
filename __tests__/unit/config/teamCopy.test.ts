import { createFormatter } from 'next-intl';
import { getTranslations } from 'next-intl/server';

// The sentences are shared with the other console-teams parts (contracts C8);
// change them there first.
describe('team copy (contracts C8)', () => {
  it('words the grant warning exactly, DCX sentence included', async () => {
    const t = await getTranslations('common');
    expect(
      t('teamCopy.grantWarning', { name: 'Sam Rivera', license: 'Harness Fleet' }),
    ).toBe(
      "Data access lets Sam Rivera use every permission vehicles have granted Harness Fleet, including commands, through the DIMO APIs — not only what the console shows. Their queries spend Harness Fleet's DCX credits.",
    );
  });

  it('words every other C8 sentence exactly', async () => {
    const t = await getTranslations('common');
    expect(
      t('teamCopy.askForAccess', {
        ownerEmail: 'ops@acme.dev',
        license: 'Harness Fleet',
      }),
    ).toBe('Ask ops@acme.dev for data access to Harness Fleet.');
    expect(t('teamCopy.noLongerHasAccess')).toBe(
      'You no longer have access to this license.',
    );
    expect(t('teamCopy.dataAccessUnavailable')).toBe(
      "Data access for team members isn't available yet.",
    );
    expect(t('teamCopy.removedFromTeam', { teamName: 'Acme Mobility' })).toBe(
      "You're no longer a member of Acme Mobility.",
    );
    expect(t('teamCopy.signerLocked', { ownerEmail: 'ops@acme.dev' })).toBe(
      'Your access is tied to another wallet. Ask ops@acme.dev to revoke it first.',
    );
    expect(
      t('teamCopy.leaveConfirm', {
        teamName: 'Acme Mobility',
        ownerEmail: 'ops@acme.dev',
      }),
    ).toBe('Leave Acme Mobility? ops@acme.dev will be asked to revoke your data access.');
    expect(t('teamCopy.signerInUse')).toBe(
      "This wallet is already recorded as someone else's key, so it can't be used for data access. Contact DIMO support.",
    );
  });

  // useFormatter().list replaced teamCopy's formatList, so English now takes
  // the serial comma for three or more names.
  it('joins license names in prose', () => {
    const format = createFormatter({ locale: 'en' });
    expect(format.list(['A'])).toBe('A');
    expect(format.list(['A', 'B'])).toBe('A and B');
    expect(format.list(['A', 'B', 'C'])).toBe('A, B, and C');
  });
});
