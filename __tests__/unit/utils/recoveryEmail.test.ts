import { emailFromRecoveryLink } from '@/utils/recoveryEmail';

describe('emailFromRecoveryLink', () => {
  it('restores the + that URLSearchParams decoded to a space', () => {
    expect(emailFromRecoveryLink('dev fleet@x.test')).toBe('dev+fleet@x.test');
  });

  it('reads a + that survived the link as a + through URLSearchParams', () => {
    const params = new URLSearchParams('email=dev+fleet@x.test');
    expect(emailFromRecoveryLink(params.get('email'))).toBe('dev+fleet@x.test');
  });

  it('leaves an address without a space alone', () => {
    expect(emailFromRecoveryLink('dev@x.test')).toBe('dev@x.test');
  });

  it('returns null when the link has no email', () => {
    expect(emailFromRecoveryLink(null)).toBeNull();
    expect(emailFromRecoveryLink('')).toBeNull();
  });
});
