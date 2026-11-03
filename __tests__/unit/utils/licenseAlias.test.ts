import { isLicenseAliasTooLong } from '@/utils/licenseAlias';

describe('isLicenseAliasTooLong', () => {
  it('accepts 32 bytes', () => {
    expect(isLicenseAliasTooLong('x'.repeat(32))).toBe(false);
  });

  it('refuses 33 bytes', () => {
    expect(isLicenseAliasTooLong('x'.repeat(33))).toBe(true);
  });

  it('counts a letter that takes two bytes as two', () => {
    expect(isLicenseAliasTooLong('é'.repeat(16))).toBe(false);
    expect(isLicenseAliasTooLong('é'.repeat(17))).toBe(true);
  });
});
