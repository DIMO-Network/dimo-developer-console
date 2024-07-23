import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { Modal } from '@/components/Modal';

describe('Modal component', () => {
  const defaultProps = {
    isOpen: true,
    setIsOpen: jest.fn(),
    className: 'test-class',
    children: <div>Test Children</div>,
  };

  it('should render the modal with default props', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Children')).toBeInTheDocument();
    expect(screen.getByRole('close-modal')).toBeInTheDocument();
  });

  it('should call setIsOpen when close button is clicked', () => {
    render(<Modal {...defaultProps} />);

    fireEvent.click(screen.getByRole('close-modal'));
    expect(defaultProps.setIsOpen).toHaveBeenCalledWith(false);
  });

  it('should not render the modal when isOpen is false', () => {
    const props = {
      ...defaultProps,
      isOpen: false,
    };

    render(<Modal {...props} />);

    expect(screen.queryByText('Test Children')).not.toBeInTheDocument();
  });
});
