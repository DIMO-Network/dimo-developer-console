// A Map with a size cap (the oldest entry goes first) and a per-entry expiry,
// so a server cache stays bounded however many sessions, licenses or assets
// pass through it (like the JWKS key set, #308).
export class BoundedCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly max: number) {}

  get(key: string, now: number): T | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, expiresAt: number) {
    this.entries.delete(key);
    if (this.entries.size >= this.max) {
      this.entries.delete(this.entries.keys().next().value as string);
    }
    this.entries.set(key, { value, expiresAt });
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}
