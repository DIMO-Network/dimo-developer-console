import { safeHttpUrl } from '@/utils/safeHttpUrl';

describe('safeHttpUrl', () => {
  it('keeps http and https URLs', () => {
    expect(safeHttpUrl('https://s3.example.com/scan.jpg?sig=1')).toBe(
      'https://s3.example.com/scan.jpg?sig=1',
    );
    expect(safeHttpUrl('http://example.com/a')).toBe('http://example.com/a');
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '/x',
    '',
    'not a url',
    null,
    undefined,
  ])('rejects %p', (v) => {
    expect(safeHttpUrl(v as string | null | undefined)).toBeNull();
  });
});
