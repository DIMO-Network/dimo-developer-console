import { render, screen } from '@testing-library/react';
import { SupportAgentIcon } from '@/components/Icons';

describe('SupportAgentIcon', () => {
  it('renders a support agent icon', () => {
    render(<SupportAgentIcon className="w-5 h-6" />);

    const supportIcon = screen.getByRole('support-agent-icon');

    expect(supportIcon).toBeInTheDocument();
  });
});
