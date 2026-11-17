// "Showing 1–10 of 25"; an empty list says so instead of "Showing 1–0 of 0".
// A common-namespace message key and its values; the table translates them.
export const paginationSummary = (
  pageIndex: number,
  pageSize: number,
  total: number,
): { key: string; values?: { first: number; last: number; total: number } } => {
  if (total === 0) return { key: 'table.showingNone' };
  const first = pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, total);
  return { key: 'table.showing', values: { first, last, total } };
};
