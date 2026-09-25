import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

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
});
