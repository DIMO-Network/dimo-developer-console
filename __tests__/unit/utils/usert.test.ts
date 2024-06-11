import { getInitials } from '@/utils/user';

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
