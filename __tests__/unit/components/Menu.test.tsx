import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MenuItem } from '@/components/Menu/MenuItem';

const MockIcon = ({ className }: { className: string }) => (
  <span className={className}>Icon</span>
);

describe('MenuItem component', () => {
  it('renders the component with a link', () => {
    render(
      <MenuItem
        link="https://example.com"
        disabled={false}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    expect(linkElement).toHaveAttribute('target', '_self');
    expect(linkElement).toHaveTextContent('Test Label');
    expect(screen.getByText('Icon')).toHaveClass('test-icon-class');
  });

  it('renders the component with an external link', () => {
    render(
      <MenuItem
        link="https://example.com"
        disabled={false}
        external={true}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    expect(linkElement).toHaveAttribute('target', '_blank');
  });

  it('renders the component with a disabled link', () => {
    render(
      <MenuItem
        link="https://example.com"
        disabled={true}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', '#');
    expect(linkElement).toHaveAttribute('target', '_self');
    expect(linkElement).toHaveTextContent('Test Label');
    expect(screen.getByText('Icon')).toHaveClass('test-icon-class');
    expect(screen.getByRole('listitem')).toHaveClass('!text-grey-200/50');
  });

  it('calls the provided function when clicked', () => {
    const handleClick = jest.fn();

    render(
      <MenuItem
        link={handleClick}
        disabled={false}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    fireEvent.click(linkElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call the provided function when disabled', () => {
    const handleClick = jest.fn();

    render(
      <MenuItem
        link={handleClick}
        disabled={true}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    fireEvent.click(linkElement);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
