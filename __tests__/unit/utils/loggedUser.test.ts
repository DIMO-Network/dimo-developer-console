import { LoggedUser } from '@/utils/loggedUser';
import type { IUser } from '@/types/user';
import type { ISubOrganization } from '@/types/wallet';

const user = {
  name: 'Sam',
  email: 'sam@x.dev',
  role: 'COLLABORATOR',
} as unknown as IUser;

describe('LoggedUser', () => {
  it('no longer treats a collaborator without a sub-organization as a global account user', () => {
    const logged = new LoggedUser(user, {} as ISubOrganization);
    expect(logged.isGlobalAccountUser).toBe(false);
    expect(logged.missingFlow).toBe('wallet-creation');
  });

  it('accepts anyone with their own sub-organization', () => {
    const logged = new LoggedUser(user, {
      subOrganizationId: 'sub-1',
    } as ISubOrganization);
    expect(logged.isGlobalAccountUser).toBe(true);
  });
});
