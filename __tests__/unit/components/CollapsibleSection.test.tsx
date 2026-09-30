import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '@/components/CollapsibleSection';

describe('CollapsibleSection', () => {
  it('starts closed, shows count and meta, opens on click', () => {
    render(
      <CollapsibleSection title="Events" count={4} meta="Last event 2 days ago">
        <p>body</p>
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole('button', { name: /Events/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Last event 2 days ago')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('body')).toBeInTheDocument();
  });
  it('can start open and keeps actions outside the toggle', () => {
    const onAction = jest.fn();
    render(
      <CollapsibleSection
        title="Latest payload"
        defaultOpen
        actions={<button onClick={onAction}>Browse</button>}
      >
        <p>body</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));
    expect(onAction).toHaveBeenCalled();
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
