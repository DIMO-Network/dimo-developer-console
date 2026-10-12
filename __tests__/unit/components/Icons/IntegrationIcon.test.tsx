import { render } from '@testing-library/react';
import { IntegrationIcon } from '@/components/Icons';

describe('IntegrationIcon', () => {
  it('renders an integration icon', () => {
    const { container } = render(<IntegrationIcon className="w-5 h-6" />);

    const integrationIcon = container.querySelector('svg');

    expect(integrationIcon).toBeInTheDocument();
  });
});
