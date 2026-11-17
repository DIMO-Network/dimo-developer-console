// Its own module, so client code can merge messages without pulling in
// messages.ts and the dynamic import of every catalog.

export type Messages = { [key: string]: unknown };

export const isTree = (value: unknown): value is Messages =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The override's values win; the base fills whatever the override lacks.
// Neither input is changed. One copy per merged level, so a catalog merges in
// linear time.
export const deepMerge = (base: Messages, override: Messages): Messages => {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    merged[key] = isTree(value) && isTree(current) ? deepMerge(current, value) : value;
  }
  return merged;
};
