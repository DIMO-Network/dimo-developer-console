import { render } from '@testing-library/react';
import { Loader } from '@/components/Loader';

describe('Loader', () => {
  it('renders a loader component', () => {
    const { container } = render(<Loader isLoading />);

    expect(container).toMatchSnapshot();
  });
});
