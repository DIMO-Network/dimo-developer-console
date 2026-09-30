// React does not block `javascript:` hrefs, so links built from upstream URLs
// go through this: only absolute http(s) URLs come back, everything else is null.
export const safeHttpUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};
