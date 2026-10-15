import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('templates Header', () => {
  // The per-row "Create" button depends on a search result coming back with
  // status 'missing', and that status is unreachable: identity reads its
  // device definitions from the R2 catalog, so every id it can return is one
  // the catalog already holds -- which makes the row 'ok' and the button
  // "Open". A search across 60 model-years over four makes returned 'ok' for
  // all 60, so there was no way to reach the create form from the UI at all.
  it('offers a way into the create form that does not depend on a search result', () => {
    render(<Header />);
    const link = screen.getByRole('link', { name: /new template/i });
    expect(link).toHaveAttribute('href', '/templates/new');
  });

  it('keeps the page description', () => {
    render(<Header />);
    expect(screen.getByText(/one model-year/i)).toBeInTheDocument();
  });
});
