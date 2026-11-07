import { render, screen } from '@testing-library/react';
import View from '@/app/support/components/View/View';
import { generateMetadata } from '@/app/support/page';
import configuration from '@/config';

jest.mock('@/app/support/components/ContactCard', () => ({
  ContactCard: ({ title, description }: { title: string; description: string }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

describe('support page', () => {
  it('shows the three options and links the status page', () => {
    render(<View />);
    expect(screen.getByText('Report an issue')).toBeInTheDocument();
    expect(screen.getByText('FAQs')).toBeInTheDocument();
    expect(screen.getByText('Feature request')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'status page' })).toHaveAttribute(
      'href',
      'https://status.dimo.org/',
    );
  });

  it('titles the page', async () => {
    expect((await generateMetadata()).title).toBe(`Support | ${configuration.appName}`);
  });
});
