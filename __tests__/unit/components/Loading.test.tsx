import { render } from '@testing-library/react';
import { Loading } from '@/components/Loading';

describe('Loading', () => {
  it('renders a button', () => {
    const { container } = render(<Loading />);

    expect(container).toMatchSnapshot();
  });
});
