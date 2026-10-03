import { BoundedCache } from '@/utils/boundedCache';

describe('BoundedCache', () => {
  it('returns entries until they expire, and drops them after', () => {
    const cache = new BoundedCache<string>(10);
    cache.set('a', 'x', 1000);
    expect(cache.get('a', 999)).toBe('x');
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry at the cap, and a rewrite counts as new', () => {
    const cache = new BoundedCache<number>(2);
    cache.set('a', 1, 100);
    cache.set('b', 2, 100);
    cache.set('a', 3, 100);
    cache.set('c', 4, 100);
    expect(cache.get('b', 0)).toBeUndefined();
    expect(cache.get('a', 0)).toBe(3);
    expect(cache.get('c', 0)).toBe(4);
  });

  it('keeps a stored null apart from a miss', () => {
    const cache = new BoundedCache<string | null>(2);
    cache.set('a', null, 100);
    expect(cache.get('a', 0)).toBeNull();
    expect(cache.get('b', 0)).toBeUndefined();
  });
});
