import React from 'react';
import { act, render, screen } from '@testing-library/react';

jest.mock('@/hooks/useIsLicenseOwner', () => ({ useIsLicenseOwner: () => true }));
jest.mock('@/hooks', () => ({
  useDimoAuth: () => ({ getGlobalAccountDeveloperJwt: jest.fn() }),
  useEventEmitter: () => ({ publishEvent: jest.fn(), eventData: undefined }),
  useIsLicenseOwner: () => true,
}));
jest.mock('@/hooks/useGetDevJwts', () => ({
  useGetDevJwts: () => ({ devJwts: [], refetch: jest.fn() }),
}));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: ({ domain }: { domain?: string }) => (
    <div data-testid="gen-domain">{domain ?? 'none'}</div>
  ),
}));
jest.mock('@/components/RedirectUriForm', () => ({
  RedirectUriForm: ({ onAdded }: { onAdded: (u: string) => void }) => (
    <button onClick={() => onAdded('https://a.test')}>add</button>
  ),
}));
jest.mock('@/components/RedirectUriList', () => ({
  RedirectUriList: ({
    redirectUris,
    onRemoved,
  }: {
    redirectUris: { uri: string }[];
    onRemoved: (u: string) => void;
  }) => (
    <div>
      <ul data-testid="list">
        {redirectUris.map((r) => (
          <li key={r.uri}>{r.uri}</li>
        ))}
      </ul>
      <button onClick={() => onRemoved('https://old.test')}>remove</button>
    </div>
  ),
}));
jest.mock('@/components/Table', () => ({ Table: () => null }));
jest.mock('@/components/DeleteConfirmationModal', () => ({
  DeleteConfirmationModal: () => null,
}));

import { RedirectUris } from '@/app/license/[tokenId]/details/components/RedirectUris/RedirectUris';
import { DeveloperJwts } from '@/app/license/[tokenId]/details/components/DeveloperJwts/DeveloperJwts';
import { RedirectUriOverlayProvider } from '@/app/license/[tokenId]/details/components/redirectUriOverlay';

type Nodes = { uri: string }[];
const fragmentOf = (nodes: Nodes) =>
  ({
    owner: '0x1',
    tokenId: 1,
    clientId: '0xc',
    redirectURIs: { nodes },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const ui = (nodes: Nodes, refetch: () => Promise<void>) => (
  <RedirectUriOverlayProvider refetch={refetch}>
    <RedirectUris license={fragmentOf(nodes)} refetch={refetch} />
    <DeveloperJwts license={fragmentOf(nodes)} />
  </RedirectUriOverlayProvider>
);

const click = (name: string) =>
  act(() => {
    screen.getByText(name).click();
  });

describe('redirect URI overlay', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("lists an added URI through a refetch that doesn't have it yet", () => {
    const refetch = jest.fn(async () => {});
    const { rerender } = render(ui([], refetch));
    click('add');
    expect(screen.getByTestId('list').textContent).toContain('https://a.test');
    rerender(ui([], refetch));
    expect(screen.getByTestId('list').textContent).toContain('https://a.test');
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.queryByTestId('list')).toBeNull();
  });

  it('drops a deleted URI at once and keeps it dropped through a stale refetch', async () => {
    const refetch = jest.fn(async () => {});
    const nodes = [{ uri: 'https://old.test' }, { uri: 'https://keep.test' }];
    const { rerender } = render(ui(nodes, refetch));
    click('remove');
    expect(screen.getByTestId('list').textContent).not.toContain('https://old.test');
    // Let the refetch promise settle, as it does before a real stale rerender.
    await act(async () => {
      await Promise.resolve();
    });
    rerender(ui([...nodes], refetch));
    expect(screen.getByTestId('list').textContent).not.toContain('https://old.test');
    expect(screen.getByTestId('list').textContent).toContain('https://keep.test');
  });

  it('lets Generate new JWT use a URI the moment it is added', () => {
    const refetch = jest.fn(async () => {});
    render(ui([], refetch));
    expect(screen.getByTestId('gen-domain').textContent).toBe('none');
    click('add');
    expect(screen.getByTestId('gen-domain').textContent).toBe('https://a.test');
  });
});
