import { render, screen } from '@testing-library/react';
import { IntegrationIcon } from '@/components/Icons';

describe('IntegrationIcon', () => {
  it('renders an integration icon', () => {
    render(<IntegrationIcon className="w-5 h-6" />);

    const integrationIcon = screen.getByRole('integration-icon');

    expect(integrationIcon).toBeInTheDocument();
  });
});
