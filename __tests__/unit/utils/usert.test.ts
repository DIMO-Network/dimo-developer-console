import { getInitials, shortenAddress } from '@/utils/user';

describe('getInitials', () => {
  it('should return initials for a full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane Smith')).toBe('JS');
  });

  it('should handle names with multiple spaces', () => {
    expect(getInitials(' John   Doe ')).toBe('JD');
  });

  it('should handle names with middle names', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
  });

  it('should handle single word names', () => {
    expect(getInitials('John')).toBe('');
  });

  it('should handle empty strings', () => {
    expect(getInitials('')).toBe('');
  });

  it('should handle names with all spaces', () => {
    expect(getInitials('   ')).toBe('');
  });

  it('should handle names with special characters', () => {
    expect(getInitials('John-Doe Smith')).toBe('JS');
  });

  it('should handle names with lowercase letters', () => {
    expect(getInitials('john doe')).toBe('JD');
  });
});

describe('shortenAddress', () => {
  it('should throw an error if address is not provided', () => {
    expect(() => shortenAddress('')).toThrow('Invalid address');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => shortenAddress(undefined as any)).toThrow('Invalid address');
  });

  it('should throw an error if address is not a string', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => shortenAddress(123 as any)).toThrow('Invalid address');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => shortenAddress(null as any)).toThrow('Invalid address');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => shortenAddress({} as any)).toThrow('Invalid address');
  });

  it('should throw an error if address does not start with 0x', () => {
    expect(() => shortenAddress('1234567890123456789012345678901234567890')).toThrow('Invalid Ethereum address');
  });

  it('should throw an error if address is not 42 characters long', () => {
    expect(() => shortenAddress('0x1234567890')).toThrow('Invalid Ethereum address');
    expect(() => shortenAddress('0x12345678901234567890123456789012345678901234')).toThrow('Invalid Ethereum address');
  });

  it('should return shortened address if address is valid', () => {
    expect(shortenAddress('0x1234567890123456789012345678901234567890')).toBe('0x1234...7890');
    expect(shortenAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe('0xabcd...abcd');
  });
});