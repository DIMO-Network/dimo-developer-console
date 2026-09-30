import { documentSharingUrl } from '@/utils/documentSharingUrl';

it('builds the Login with DIMO account-manager link for a license', () => {
  const url = new URL(
    documentSharingUrl({ clientId: '0xabc', redirectUri: 'https://app.example.com/cb' }),
  );
  expect(url.origin).toBe('https://login.dev.dimo.org');
  expect(url.searchParams.get('clientId')).toBe('0xabc');
  expect(url.searchParams.get('redirectUri')).toBe('https://app.example.com/cb');
  expect(url.searchParams.get('entryState')).toBe('ACCOUNT_MANAGER');
});
