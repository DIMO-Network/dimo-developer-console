import { render, screen, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';

import { SignInButtons } from '@/components/SignInButton';

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

describe('SignInButtons', () => {
  it.each([
    [0, 'google'],
    [1, 'apple'],
    [2, 'github'],
  ])('calls onCTA when button %i is clicked with %s', (index, app) => {
    const onCTA = jest.fn();

    render(<SignInButtons disabled={false} onCTA={onCTA} />);

    fireEvent.click(screen.getAllByRole('sign-in-button')[index]);

    expect(onCTA).toHaveBeenCalledWith(app);
  });

  it('shows an error instead of signing in when disabled', () => {
    const onCTA = jest.fn();

    render(<SignInButtons disabled onCTA={onCTA} />);

    fireEvent.click(screen.getAllByRole('sign-in-button')[0]);

    expect(onCTA).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      'You must accept terms of service and privacy policy',
    );
  });
});
