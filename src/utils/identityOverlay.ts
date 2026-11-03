// Identity needs a few seconds to index a chain change; reloading sooner would
// bring back the old state.
export const IDENTITY_INDEX_DELAY_MS = 6000;

// How long a change this page made outranks Identity's list.
export const OVERLAY_MS = 60_000;

export interface ValueToggle {
  value: string;
  enabled: boolean;
  at: number;
}

// Identity's lists lag the chain, so changes this page just made win, in order,
// until they are a minute old.
export const applyToggles = (
  values: string[],
  toggles: ValueToggle[],
  now: number,
): string[] => {
  const live = toggles.filter((t) => now - t.at < OVERLAY_MS);
  if (!live.length) return values;
  const result = new Set(values);
  for (const { value, enabled } of live) {
    if (enabled) result.add(value);
    else result.delete(value);
  }
  return [...result];
};
