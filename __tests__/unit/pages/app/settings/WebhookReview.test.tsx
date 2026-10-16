import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/webhook', () => ({ fetchWebhooks: jest.fn() }));
const getGlobalAccountDeveloperJwt = jest.fn();
jest.mock('@/hooks/useDimoAuth', () => ({
  useDimoAuth: () => ({ getGlobalAccountDeveloperJwt }),
}));
jest.mock('@/utils/devJwt', () => ({ getDevJwt: jest.fn() }));
import { fetchWebhooks } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import { WebhookReview } from '@/app/settings/components/Team/WebhookReview';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: CURRENT,
  memberKeys: [{ licenseTokenId: 42, signerAddress: OLD }],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES: TeamLicense[] = [
  {
    tokenId: 42,
    clientId: CLIENT,
    label: 'Harness Fleet',
    redirectUri: 'https://harness.dev/callback',
    signers: [CURRENT.toLowerCase()],
  },
];
const webhook = (id: string, extra: object) => ({
  id,
  displayName: `Hook ${id}`,
  targetURL: `https://hooks.harness.dev/${id}`,
  ...extra,
});
// jsdom: btoa, not Buffer.
const b64 = (o: object) =>
  btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwtFor = (clientId: string) =>
  `${b64({ alg: 'none' })}.${b64({ ethereum_address: clientId })}.sig`;
const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WebhookReview member={SAM} licenses={LICENSES} />
    </QueryClientProvider>,
  );

describe('WebhookReview', () => {
  beforeEach(() => {
    (fetchWebhooks as jest.Mock).mockResolvedValue([
      webhook('a', { createdBySigner: OLD }),
      webhook('b', { updatedBySigner: CURRENT.toLowerCase() }),
      webhook('c', { createdBySigner: '0x0000000000000000000000000000000000000001' }),
    ]);
  });

  it('lists webhooks created or last changed by any wallet the member used', async () => {
    (getDevJwt as jest.Mock).mockReturnValue('owner.jwt');
    show();
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
    expect(screen.getByText('Created by them')).toBeInTheDocument();
    expect(screen.getByText('Hook b')).toBeInTheDocument();
    expect(screen.getByText('Last changed by them')).toBeInTheDocument();
    expect(screen.queryByText('Hook c')).toBeNull();
    expect(fetchWebhooks).toHaveBeenCalledWith({ token: 'owner.jwt' });
    expect(getGlobalAccountDeveloperJwt).not.toHaveBeenCalled();
  });

  it("gets a developer JWT from the owner's wallet when this browser has none", async () => {
    (getDevJwt as jest.Mock).mockReturnValueOnce(null).mockReturnValue('fresh.jwt');
    getGlobalAccountDeveloperJwt.mockResolvedValue(true);
    show();
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
    expect(getGlobalAccountDeveloperJwt).toHaveBeenCalledWith({
      clientId: CLIENT,
      domain: 'https://harness.dev/callback',
    });
    expect(fetchWebhooks).toHaveBeenCalledWith({ token: 'fresh.jwt' });
  });

  it('falls back to a pasted developer JWT, for this license only', async () => {
    (getDevJwt as jest.Mock).mockReturnValue(null);
    getGlobalAccountDeveloperJwt.mockResolvedValue(false);
    show();
    const field = await screen.findByLabelText('Paste a developer JWT for Harness Fleet');
    fireEvent.change(field, {
      target: { value: jwtFor('0x0000000000000000000000000000000000000002') },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check webhooks' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That developer JWT is for another license.',
    );
    fireEvent.change(field, {
      target: { value: jwtFor(CLIENT.toUpperCase().replace('0X', '0x')) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check webhooks' }));
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
  });

  it('says when nothing needs review', async () => {
    (getDevJwt as jest.Mock).mockReturnValue('owner.jwt');
    (fetchWebhooks as jest.Mock).mockResolvedValue([]);
    show();
    await waitFor(() =>
      expect(
        screen.getByText(
          'No webhooks on Harness Fleet were created or changed by Sam Rivera.',
        ),
      ).toBeInTheDocument(),
    );
  });
});
