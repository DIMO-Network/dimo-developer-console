import { act, renderHook, waitFor } from '@testing-library/react';
import {
  GetVehicleCountByClientIdDocument,
  GetVehiclesByClientIdDocument,
} from '@/gql/graphql';
import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { IdentityGraphQLError } from '@/services/identityApi';
import { HttpError } from '@/utils/httpError';
import { mockIdentityApi, queryClientWrapper } from '@/utils/__fixtures__/identityApi';

const CLIENT = '0x00000000000000000000000000000000000000aa';
const count = (totalCount: number) => ({ data: { vehicles: { totalCount } } });
const page = (cursor: string) => ({
  data: {
    vehicles: {
      totalCount: 2,
      nodes: [{ tokenId: cursor === 'p1' ? 1 : 2 }],
      pageInfo: { startCursor: cursor, endCursor: cursor },
    },
  },
});

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: queryClientWrapper().Wrapper });

describe('useIdentityQuery', () => {
  it('posts the generated query with its variables and returns the data', async () => {
    const identity = mockIdentityApi(() => count(6));
    const { result } = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
      }),
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ vehicles: { totalCount: 6 } });
    expect(result.current.error).toBeUndefined();
    expect(identity.requests).toEqual([
      {
        query: GetVehicleCountByClientIdDocument.toString(),
        variables: { clientId: CLIENT },
      },
    ]);
  });

  it('runs nothing while skipped, and returns nothing, cached or not', async () => {
    const identity = mockIdentityApi(() => count(6));
    const { Wrapper } = queryClientWrapper();
    const first = renderHook(
      () =>
        useIdentityQuery(GetVehicleCountByClientIdDocument, {
          variables: { clientId: CLIENT },
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(first.result.current.data).toBeDefined());
    const skipped = renderHook(
      () =>
        useIdentityQuery(GetVehicleCountByClientIdDocument, {
          variables: { clientId: CLIENT },
          skip: true,
        }),
      { wrapper: Wrapper },
    );
    expect(skipped.result.current).toMatchObject({
      data: undefined,
      loading: false,
      error: undefined,
    });
    expect(identity.requests).toHaveLength(1);
  });

  it('turns GraphQL errors into an error, without asking again', async () => {
    const identity = mockIdentityApi(() => ({
      errors: [{ message: 'vehicle not found' }],
    }));
    const { result } = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
      }),
    );
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error).toBeInstanceOf(IdentityGraphQLError);
    expect(result.current.error?.message).toBe('vehicle not found');
    expect(result.current.data).toBeUndefined();
    expect(identity.requests).toHaveLength(1);
  });

  it('asks once more after a server error, never after a 4xx', async () => {
    const down = mockIdentityApi(() => ({ status: 503 }));
    const failed = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
      }),
    );
    await waitFor(() => expect(failed.result.current.error).toBeDefined());
    expect(failed.result.current.error).toBeInstanceOf(HttpError);
    expect(down.requests).toHaveLength(2);

    const refused = mockIdentityApi(() => ({ status: 400 }));
    const declined = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
      }),
    );
    await waitFor(() => expect(declined.result.current.error).toBeDefined());
    expect(refused.requests).toHaveLength(1);
  });

  it("keeps the data and drops the errors with errorPolicy 'ignore'", async () => {
    mockIdentityApi(() => ({
      data: { vehicles: { totalCount: 3 } },
      errors: [{ message: 'one field failed' }],
    }));
    const { result } = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
        errorPolicy: 'ignore',
      }),
    );
    await waitFor(() =>
      expect(result.current.data).toEqual({ vehicles: { totalCount: 3 } }),
    );
    expect(result.current.error).toBeUndefined();
  });

  it('refetches without going back to loading', async () => {
    let total = 1;
    const identity = mockIdentityApi(() => count(total));
    const { result } = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
      }),
    );
    await waitFor(() => expect(result.current.data).toEqual(count(1).data));
    total = 2;
    let refetched: Promise<unknown> | undefined;
    act(() => {
      refetched = result.current.refetch();
    });
    expect(result.current.loading).toBe(false);
    await act(async () => {
      await expect(refetched).resolves.toEqual({ data: count(2).data });
    });
    await waitFor(() => expect(result.current.data).toEqual(count(2).data));
    expect(identity.requests).toHaveLength(2);
  });

  it('pages by merging variables, showing the old page until the new one is in', async () => {
    let release: () => void = () => {};
    const identity = mockIdentityApi(async ({ variables }) => {
      if (variables.after === 'p1')
        await new Promise<void>((resolve) => (release = resolve));
      return page(variables.after ? 'p2' : 'p1');
    });
    const { result } = render(() =>
      useIdentityQuery(GetVehiclesByClientIdDocument, {
        variables: { clientId: CLIENT, owner: null, first: 1 },
      }),
    );
    await waitFor(() => expect(result.current.data).toEqual(page('p1').data));

    let paged: Promise<unknown> | undefined;
    act(() => {
      paged = result.current.refetch({ after: 'p1', first: 1, last: null, before: null });
    });
    await waitFor(() => expect(identity.requests).toHaveLength(2));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(page('p1').data);

    await act(async () => {
      release();
      await paged;
    });
    await waitFor(() => expect(result.current.data).toEqual(page('p2').data));
    // Fetched once: moving to it reads the cache.
    expect(identity.requests).toHaveLength(2);
    expect(identity.requests[1].variables).toEqual({
      clientId: CLIENT,
      owner: null,
      first: 1,
      last: null,
      before: null,
      after: 'p1',
    });
  });

  it("starts over from the caller's variables when they change", async () => {
    const identity = mockIdentityApi(({ variables }) =>
      page(variables.after ? 'p2' : 'p1'),
    );
    const { result, rerender } = renderHook(
      ({ owner }: { owner: string | null }) =>
        useIdentityQuery(GetVehiclesByClientIdDocument, {
          variables: { clientId: CLIENT, owner, first: 1 },
        }),
      {
        wrapper: queryClientWrapper().Wrapper,
        initialProps: { owner: null as string | null },
      },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(async () => {
      await result.current.refetch({ after: 'p1' });
    });
    rerender({ owner: '0x00000000000000000000000000000000000000bb' });
    await waitFor(() => expect(identity.requests).toHaveLength(3));
    expect(identity.requests[2].variables).toEqual({
      clientId: CLIENT,
      owner: '0x00000000000000000000000000000000000000bb',
      first: 1,
    });
  });

  it('rejects a refetch that fails', async () => {
    let fail = false;
    mockIdentityApi(() => (fail ? { errors: [{ message: 'gone' }] } : count(1)));
    const { result } = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
      }),
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    fail = true;
    await act(async () => {
      await expect(result.current.refetch()).rejects.toThrow('gone');
    });
  });

  it('shares one request and one refetch between components asking the same', async () => {
    let total = 1;
    const identity = mockIdentityApi(() => count(total));
    const { Wrapper } = queryClientWrapper();
    const options = { variables: { clientId: CLIENT } };
    const a = renderHook(
      () => useIdentityQuery(GetVehicleCountByClientIdDocument, options),
      {
        wrapper: Wrapper,
      },
    );
    const b = renderHook(
      () => useIdentityQuery(GetVehicleCountByClientIdDocument, options),
      {
        wrapper: Wrapper,
      },
    );
    await waitFor(() => expect(b.result.current.data).toEqual(count(1).data));
    expect(identity.requests).toHaveLength(1);

    total = 4;
    await act(async () => {
      await a.result.current.refetch();
    });
    await waitFor(() => expect(b.result.current.data).toEqual(count(4).data));
    expect(identity.requests).toHaveLength(2);
  });

  it("doesn't bring an old page back when the caller's variables return to before", async () => {
    const identity = mockIdentityApi(({ variables }) =>
      page(variables.after ? 'p2' : 'p1'),
    );
    const OTHER = '0x00000000000000000000000000000000000000bb';
    const { result, rerender } = renderHook(
      ({ owner }: { owner: string | null }) =>
        useIdentityQuery(GetVehiclesByClientIdDocument, {
          variables: { clientId: CLIENT, owner, first: 1 },
        }),
      {
        wrapper: queryClientWrapper().Wrapper,
        initialProps: { owner: null as string | null },
      },
    );
    await waitFor(() => expect(result.current.data).toEqual(page('p1').data));
    await act(async () => {
      await result.current.refetch({ after: 'p1' });
    });
    await waitFor(() => expect(result.current.data).toEqual(page('p2').data));
    rerender({ owner: OTHER });
    await waitFor(() => expect(identity.requests).toHaveLength(3));
    rerender({ owner: null });
    // Page 1 for the first filter again, from the cache: not page 2.
    await waitFor(() => expect(result.current.data).toEqual(page('p1').data));
    expect(
      identity.requests.every(
        ({ variables }) => variables.after !== 'p1' || variables.owner === null,
      ),
    ).toBe(true);
    expect(identity.requests).toHaveLength(3);
  });

  it('keeps the current page when the next one fails, and rejects', async () => {
    const identity = mockIdentityApi(({ variables }) =>
      variables.after ? { errors: [{ message: 'page gone' }] } : page('p1'),
    );
    const { result } = render(() =>
      useIdentityQuery(GetVehiclesByClientIdDocument, {
        variables: { clientId: CLIENT, owner: null, first: 1 },
      }),
    );
    await waitFor(() => expect(result.current.data).toEqual(page('p1').data));
    await act(async () => {
      await expect(result.current.refetch({ after: 'p1' })).rejects.toThrow('page gone');
    });
    expect(result.current.data).toEqual(page('p1').data);
    expect(result.current.error).toBeUndefined();
    expect(result.current.loading).toBe(false);
    // Asked once, not again on a move to the failed page.
    expect(identity.requests).toHaveLength(2);
  });

  it("returns no data and no error when errorPolicy 'ignore' meets errors and no data", async () => {
    const identity = mockIdentityApi(() => ({
      data: null,
      errors: [{ message: 'no such license' }],
    }));
    const { result } = render(() =>
      useIdentityQuery(GetVehicleCountByClientIdDocument, {
        variables: { clientId: CLIENT },
        errorPolicy: 'ignore',
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(identity.requests).toHaveLength(1);
  });
});
