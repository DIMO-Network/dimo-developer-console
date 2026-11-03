// "Showing 1–10 of 25"; an empty list says so instead of "Showing 1–0 of 0".
export const paginationSummary = (
  pageIndex: number,
  pageSize: number,
  total: number,
): string => {
  if (total === 0) return 'Showing 0 of 0';
  const first = pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, total);
  return `Showing ${first}–${last} of ${total}`;
};
