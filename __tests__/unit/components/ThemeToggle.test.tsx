import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/ThemeToggle';

const renderToggle = (variant: 'menu' | 'icon', collapsed = false) =>
  render(
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
      <ThemeToggle variant={variant} collapsed={collapsed} />
    </ThemeProvider>,
  );

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no matchMedia; next-themes reads it on mount.
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
  });

  it('offers light mode from dark and switches the document', () => {
    renderToggle('menu');
    fireEvent.click(screen.getByRole('button', { name: 'Light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('icon variant is labelled for screen readers', () => {
    renderToggle('icon');
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument();
  });

  it('collapsed menu variant keeps the label as its accessible name', () => {
    renderToggle('menu', true);
    expect(screen.getByRole('button', { name: 'Light mode' })).toHaveAttribute(
      'title',
      'Light mode',
    );
  });
});
