import { fireEvent, render, screen } from '@testing-library/react';

import { Toggle } from '@/components/Toggle';

describe('Toggle', () => {
  it('renders a toggle component', () => {
    const handleChange = jest.fn();

    const { container } = render(<Toggle onToggle={handleChange} />);

    const toggleElm = screen.getByLabelText('toggle');

    expect(container).toMatchSnapshot();
    expect(toggleElm).toBeInTheDocument();

    fireEvent.click(toggleElm);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.click(toggleElm);

    expect(handleChange).toHaveBeenCalledWith(false);
  });
});
