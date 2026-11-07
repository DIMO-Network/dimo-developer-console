import { paginationSummary } from '@/components/Table/paginationSummary';

describe('paginationSummary', () => {
  it('says an empty list is empty instead of "1–0 of 0"', () => {
    expect(paginationSummary(0, 10, 0)).toEqual({ key: 'table.showingNone' });
  });
  it('names the first page', () => {
    expect(paginationSummary(0, 10, 25)).toEqual({
      key: 'table.showing',
      values: { first: 1, last: 10, total: 25 },
    });
  });
  it('stops at the total on the last page', () => {
    expect(paginationSummary(2, 10, 25)).toEqual({
      key: 'table.showing',
      values: { first: 21, last: 25, total: 25 },
    });
  });
});
