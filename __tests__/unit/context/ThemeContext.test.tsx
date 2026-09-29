import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';

const Probe = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('starts from the stored theme and toggles the document', () => {
    localStorage.setItem('dimo-theme', 'light');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('light');
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('dimo-theme')).toBeNull();
  });

  // A client-rendered tree can keep the SSR default (dark) on <html> even though
  // the user chose light: the provider must re-apply the stored theme on mount.
  it('applies the stored theme when <html> still carries the SSR default', () => {
    localStorage.setItem('dimo-theme', 'light');
    document.documentElement.dataset.theme = 'dark';
    render(
      <ThemeProvider>
        <ThemeToggle variant="menu" />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  });
});
