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
  fill(/make slug/i, 'ineos');
  fill(/model slug/i, 'grenadier');
  fill(/^year/i, '2024');
  fill(/manufacturer name/i, 'INEOS');
  fill(/model name/i, 'Grenadier');
  fill(/first trim/i, 'Trialmaster');
};

describe('NewTemplateView', () => {
  beforeEach(() => {
    push.mockReset();
    ok();
  });

  it('builds the id from make slug, model slug and year, and shows it', () => {
    show();
    fill(/make slug/i, 'ineos');
    fill(/model slug/i, 'grenadier');
    fill(/^year/i, '2024');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('ineos_grenadier_2024');
  });

  it('pre-fills the id the browse page handed it', () => {
    show('toyota_supra_2020');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('toyota_supra_2020');
  });

  it('refuses a slug the id pattern cannot accept, before any request', async () => {
    const f = ok();
    show();
    fill(/make slug/i, 'Subaru');
    fill(/model slug/i, 'tribeca-(ny/nj)');
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
    fill(/make slug/i, 'toyota');
    fill(/model slug/i, 'camry');
    fill(/^year/i, '2020');
    fill(/manufacturer name/i, 'Toyota');
    fill(/model name/i, 'Camry');
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
