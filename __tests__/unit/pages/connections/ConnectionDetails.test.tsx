import React, { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { View } from '@/app/connections/[id]/components/View';
import { CONNECTION_GONE_DETAIL, KEYS_UNREADABLE_DETAIL } from '@/app/connections/copy';

const answer = (status: number, body: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
};

const renderPage = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <Suspense fallback={null}>
          <View params={Promise.resolve({ id: 'c1' })} />
        </Suspense>
      </QueryClientProvider>,
    );
  });
};

describe('connection details', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('says a deleted connection no longer exists', async () => {
    answer(404, { message: 'Could not load the connection' });
    await renderPage();

    expect(await screen.findByText(CONNECTION_GONE_DETAIL)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Connections' })).toHaveAttribute(
      'href',
      '/connections',
    );
    expect(screen.queryByText(/problem loading/)).toBeNull();
  });

  it('keeps the generic error for other failures', async () => {
    answer(500, {});
    await renderPage();

    expect(await screen.findByText(/problem loading/)).toBeInTheDocument();
  });

  it("says when the keys can't be read", async () => {
    answer(200, {
      id: 'c1',
      name: 'Fleet',
      connection_license_public_key: '0xPUBLIC',
      connection_license_private_key: null,
      device_issuance_key: null,
      keys_unreadable: true,
    });
    await renderPage();

    expect(await screen.findByText(KEYS_UNREADABLE_DETAIL)).toBeInTheDocument();
    expect(screen.getByText('0xPUBLIC')).toBeInTheDocument();
    expect(screen.queryByText('Connection license private key')).toBeNull();
    expect(screen.queryByText('Device issuance key')).toBeNull();
    // Only the public key can be copied.
    expect(screen.getAllByRole('button', { name: /copy/i })).toHaveLength(1);
  });
});
