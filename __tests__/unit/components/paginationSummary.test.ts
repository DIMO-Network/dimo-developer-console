import { paginationSummary } from '@/components/Table/paginationSummary';

describe('paginationSummary', () => {
  it('says an empty list is empty', () => {
    expect(paginationSummary(0, 10, 0)).toBe('Showing 0 of 0');
  });
  it('shows the first page', () => {
    expect(paginationSummary(0, 10, 25)).toBe('Showing 1–10 of 25');
  });
  it('clips the last page to the total', () => {
    expect(paginationSummary(2, 10, 25)).toBe('Showing 21–25 of 25');
  });
});
