import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => localStorage.clear());

  it('offers light mode from dark and switches the document', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="menu" />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('icon variant is labelled for screen readers', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="icon" />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument();
  });
});
