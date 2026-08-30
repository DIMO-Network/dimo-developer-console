import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewTemplateView } from '../components/View';

const publish = jest.fn();
const push = jest.fn();

jest.mock('@/hooks/queries/useTemplate', () => ({
  usePublishTemplate: () => ({ mutateAsync: publish, isPending: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('NewTemplateView', () => {
  beforeEach(() => {
    publish.mockReset().mockResolvedValue({ id: 'ineos_grenadier_2024', version: 1 });
    push.mockReset();
  });

  it('builds the id from make slug, model slug and year, and shows it', () => {
    render(<NewTemplateView />);
    fill(/make slug/i, 'ineos');
    fill(/model slug/i, 'grenadier');
    fill(/^year/i, '2024');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('ineos_grenadier_2024');
  });

  it('pre-fills the id the browse page handed it', () => {
    render(<NewTemplateView presetId="toyota_supra_2020" />);
    expect(screen.getByTestId('derived-id')).toHaveTextContent('toyota_supra_2020');
  });

  it('refuses a slug the id pattern cannot accept, before any request', async () => {
    render(<NewTemplateView />);
    fill(/make slug/i, 'Subaru');
    fill(/model slug/i, 'tribeca-(ny/nj)');
    fill(/^year/i, '2008');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(
      await screen.findByText('id must be <make>_<model>_<year>'),
    ).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();
  });

  it('creates with a null precondition so the route sends If-None-Match', async () => {
    render(<NewTemplateView />);
    fill(/make slug/i, 'ineos');
    fill(/model slug/i, 'grenadier');
    fill(/^year/i, '2024');
    fill(/manufacturer name/i, 'INEOS');
    fill(/model name/i, 'Grenadier');
    fill(/first trim/i, 'Trialmaster');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(publish).toHaveBeenCalled());
    expect(publish.mock.calls[0][0].version).toBeNull();
    expect(publish.mock.calls[0][0].payload.trims).toEqual([
      { name: 'Trialmaster', attributes: {} },
    ]);
  });

  it('says the template already exists rather than reporting a generic failure', async () => {
    publish.mockRejectedValue({ status: 409, conflict: { expected: null, actual: 4 } });
    render(<NewTemplateView />);
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
  });
});
