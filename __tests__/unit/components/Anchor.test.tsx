import { render, screen } from '@testing-library/react';
import { Anchor } from '@/components/Anchor';

describe('Anchor', () => {
  it('renders an anchor', () => {
    render(
      <Anchor href="#" className="primary">
        Forgot password?
      </Anchor>
    );

    const buttonText = screen.getByText('Forgot password?');

    expect(buttonText).toBeInTheDocument();
  });
});
