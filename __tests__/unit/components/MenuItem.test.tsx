import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuItem } from '@/components/Menu/MenuItem';

const mockIcon = ({ className }: { className: string }) => (
  <svg className={className} data-testid="icon" />
);

describe('MenuItem Component', () => {
  it('renders the MenuItem component with a link and label', () => {
    render(
      <MenuItem
        link="https://example.com"
        external={false}
        disabled={false}
        icon={mockIcon}
        iconClassName="icon-class"
        label="Menu Item"
      />,
    );

    expect(screen.getByText('Menu Item')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByTestId('icon')).toHaveClass('icon-class');
  });

  it('renders the MenuItem component with an external link', () => {
    render(
      <MenuItem
        link="https://example.com"
        external={true}
        disabled={false}
        icon={mockIcon}
        iconClassName="icon-class"
        label="External Menu Item"
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  it('renders the MenuItem component as disabled', () => {
    render(
      <MenuItem
        link="https://example.com"
        external={false}
        disabled={true}
        icon={mockIcon}
        iconClassName="icon-class"
        label="Disabled Menu Item"
      />,
    );

    waitFor(() => {
      expect(screen.getByText('Disabled Menu Item')).toHaveClass('!text-grey-200/50');
    });
    expect(screen.getByRole('link')).toHaveAttribute('href', '#');
    fireEvent.click(screen.getByRole('link'));
  });

  it('handles onClick when link is a function', () => {
    const handleClick = jest.fn();

    render(
      <MenuItem
        link={handleClick}
        external={false}
        disabled={false}
        icon={mockIcon}
        iconClassName="icon-class"
        label="Clickable Menu Item"
      />,
    );

    fireEvent.click(screen.getByRole('link'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('does not handle onClick when link is a function and component is disabled', () => {
    const handleClick = jest.fn();

    render(
      <MenuItem
        link={handleClick}
        external={false}
        disabled={true}
        icon={mockIcon}
        iconClassName="icon-class"
        label="Disabled Clickable Menu Item"
      />,
    );

    fireEvent.click(screen.getByRole('link'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
