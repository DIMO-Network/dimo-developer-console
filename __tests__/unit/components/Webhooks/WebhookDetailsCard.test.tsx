import { render, screen } from '@testing-library/react';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import type { Webhook } from '@/types/webhook';

const webhook = (service: string) =>
  ({
    service,
    description: 'Speeding',
    coolDownPeriod: 30,
    targetURL: 'https://example.com/hook',
    status: 'enabled',
  }) as Webhook;

describe('WebhookDetailsCard', () => {
  it.each([
    ['signals', 'VSS Signals'],
    ['events', 'Events'],
    ['something-new', 'something-new'],
  ])('labels the %s service as %s', (service, label) => {
    render(<WebhookDetailsCard webhook={webhook(service)} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
