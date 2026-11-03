import { OVERLAY_MS, applyToggles } from '@/utils/identityOverlay';

const AT = 1_000_000;

describe('applyToggles', () => {
  it("adds an enabled value Identity doesn't list yet", () => {
    expect(applyToggles(['a'], [{ value: 'b', enabled: true, at: AT }], AT + 1)).toEqual([
      'a',
      'b',
    ]);
  });

  it('removes a disabled value Identity still lists', () => {
    expect(
      applyToggles(['a', 'b'], [{ value: 'a', enabled: false, at: AT }], AT + 1),
    ).toEqual(['b']);
  });

  it('applies changes in order', () => {
    const toggles = [
      { value: 'x', enabled: true, at: AT },
      { value: 'x', enabled: false, at: AT + 1 },
    ];
    expect(applyToggles([], toggles, AT + 2)).toEqual([]);
  });

  it('forgets a change after a minute', () => {
    expect(
      applyToggles(['a'], [{ value: 'b', enabled: true, at: AT }], AT + OVERLAY_MS),
    ).toEqual(['a']);
  });
});
