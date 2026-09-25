export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'dimo-theme';

export const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    if (theme === 'light') localStorage.setItem(THEME_STORAGE_KEY, 'light');
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
};

// Runs in <head> before first paint so a light page never flashes dark.
export const THEME_INIT_SCRIPT = `(function(){var t='dark';try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='light')t='light';}catch(e){}document.documentElement.dataset.theme=t;})();`;
