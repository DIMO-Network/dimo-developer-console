import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewTemplateView } from '../components/View';

const push = jest.fn();

// The publish mutation is deliberately NOT mocked. What this page gets wrong is
// what it puts on the wire -- it used to send no precondition at all, which the
// route reads as "editing, and you forgot your If-Match" and answers 428, so
// the already-exists state below could never fire. Mocking the mutation to
// reject with a 409 asserts the handler and hides the defect.
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockFetch = (impl: jest.Mock) => {
  global.fetch = impl as unknown as typeof fetch;
  return impl;
};

const ok = () =>
  mockFetch(
    jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ template: { id: 'ineos_grenadier_2024', version: 1 } }),
    }),
  );

const show = (presetId?: string) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NewTemplateView presetId={presetId} />
    </QueryClientProvider>,
  );
};

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillGrenadier = () => {
  fill(/^manufacturer/i, 'INEOS');
  fill(/^model/i, 'Grenadier');
  fill(/^year/i, '2024');
  fill(/first trim/i, 'Trialmaster');
};

describe('NewTemplateView', () => {
  beforeEach(() => {
    push.mockReset();
    ok();
  });

  it('derives the id from the names, so the slug is never typed twice', () => {
    show();
    fill(/^manufacturer/i, 'INEOS');
    fill(/^model/i, 'Grenadier');
    fill(/^year/i, '2024');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('ineos_grenadier_2024');
  });

  it('gives the same id whether the person types the display name or the slug', () => {
    show();
    fill(/^manufacturer/i, 'Toyota');
    fill(/^model/i, 'Camry');
    fill(/^year/i, '2020');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('toyota_camry_2020');
    fill(/^manufacturer/i, 'toyota');
    fill(/^model/i, 'camry');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('toyota_camry_2020');
  });

  it('pre-fills the id the browse page handed it', () => {
    show('toyota_supra_2020');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('toyota_supra_2020');
  });

  it('repairs a model an id cannot carry instead of refusing it', async () => {
    // This used to be a refusal, because the slug was typed and
    // `tribeca-(ny/nj)` is not a legal id segment. Deriving it means the person
    // types the real model name and the id is built the way the only minter of
    // ids builds it -- the live catalog holds subaru_tribeca-ny-nj_2008.
    const f = ok();
    show();
    fill(/^manufacturer/i, 'Subaru');
    fill(/^model/i, 'Tribeca (NY/NJ)');
    fill(/^year/i, '2008');
    fill(/first trim/i, 'Base');
    expect(screen.getByTestId('derived-id')).toHaveTextContent(
      'subaru_tribeca-ny-nj_2008',
    );
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(f).toHaveBeenCalled());
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/templates/subaru_tribeca-ny-nj_2008');
    // The BODY keeps the real name; only the id is slugged.
    expect(JSON.parse(init.body).model).toBe('Tribeca (NY/NJ)');
    expect(JSON.parse(init.body).manufacturer).toMatchObject({
      slug: 'subaru',
      name: 'Subaru',
    });
  });

  it('still refuses an id it cannot build at all, before any request', async () => {
    const f = ok();
    show();
    fill(/^manufacturer/i, 'Subaru');
    fill(/^model/i, '');
    fill(/^year/i, '2008');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(
      await screen.findByText('id must be <make>_<model>_<year>'),
    ).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });

  it('states create intent with If-None-Match rather than sending no precondition', async () => {
    // Sending nothing is not "create", it is "an edit that forgot its
    // precondition", and the route is right to answer 428 to that. The page has
    // to say which one it means.
    const f = ok();
    show();
    fillGrenadier();
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(f).toHaveBeenCalled());

    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/templates/ineos_grenadier_2024');
    expect(init.method).toBe('PUT');
    expect(init.headers['If-None-Match']).toBe('*');
    expect(init.headers['If-Match']).toBeUndefined();
    expect(JSON.parse(init.body).trims).toEqual([
      { name: 'Trialmaster', attributes: {} },
    ]);
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/templates/ineos_grenadier_2024'),
    );
  });

  it('says the template already exists rather than reporting a generic failure', async () => {
    // The route maps the worker's 412 on a create-only precondition to 409, and
    // this is the state that answers it. Driven through the real mutation over
    // the response the route actually sends.
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'This template changed while you were editing it.',
          conflict: { expected: null, actual: 4 },
        }),
      }),
    );
    show();
    fill(/^manufacturer/i, 'Toyota');
    fill(/^model/i, 'Camry');
    fill(/^year/i, '2020');
    fill(/first trim/i, 'LE');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('link', { name: /open it/i })).toHaveAttribute(
      'href',
      '/templates/toyota_camry_2020',
    );
    expect(push).not.toHaveBeenCalled();
  });
});
