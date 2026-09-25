import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
} from '@/utils/theme';

describe('theme utils', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to dark when nothing is stored', () => {
    expect(readStoredTheme()).toBe('dark');
  });

  it('reads a stored light theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readStoredTheme()).toBe('light');
  });

  it('treats an unknown stored value as dark', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredTheme()).toBe('dark');
  });

  it('applies light to <html> and remembers it', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('applies dark and forgets the stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('pre-paint script sets the stored theme before React runs', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('pre-paint script falls back to dark when storage throws', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('dark');
    spy.mockRestore();
  });
});
