import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import camry from '@/utils/__fixtures__/toyota_camry_2020.json';
import { vehicleVocab } from '@/utils/__fixtures__/vehicleVocab';
import { TemplateEditorView } from '../components/View';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;

const publish = jest.fn();
const refetch = jest.fn();

// A mutable bundle rather than a second module mock: the read-only branch is a
// different entitlement, not a different module, and the component must derive
// it from the data it is given.
let bundle: {
  template: Template;
  vocabulary: typeof vehicleVocab;
  entitlement: {
    kind: string;
    canPublish: boolean;
    canSetHardwareTemplateId: boolean;
    mintedVehicles: number;
    reason: string;
  };
};

jest.mock('@/hooks/queries/useTemplate', () => ({
  useTemplate: () => ({ data: bundle, isLoading: false, error: null, refetch }),
  usePublishTemplate: () => ({ mutateAsync: publish, isPending: false }),
}));

const authorBundle = () => ({
  template: t,
  vocabulary: vehicleVocab,
  entitlement: {
    kind: 'author',
    canPublish: true,
    canSetHardwareTemplateId: false,
    mintedVehicles: 0,
    reason: 'No vehicle references this template yet.',
  },
});

/** Publish is disabled until the draft differs from what was loaded. */
const edit = () => {
  const input = within(screen.getByTestId('cell-mpg_city-0')).getByRole('textbox');
  fireEvent.change(input, { target: { value: '27' } });
  fireEvent.blur(input);
};

describe('TemplateEditorView', () => {
  beforeEach(() => {
    bundle = authorBundle();
    publish.mockReset().mockResolvedValue({ ...t, version: t.version + 1 });
    refetch.mockReset();
  });

  it('shows the current version and the author of the version it loaded', () => {
    render(<TemplateEditorView id={t.id} />);
    expect(screen.getByText(new RegExp(`v${t.version}`))).toBeInTheDocument();
  });

  it('leaves publish disabled until something actually changed', () => {
    render(<TemplateEditorView id={t.id} />);
    expect(screen.getByRole('button', { name: /^publish/i })).toBeDisabled();
    edit();
    expect(screen.getByRole('button', { name: /^publish/i })).toBeEnabled();
  });

  it('refuses to publish while the draft would fail the worker, and names the fault', async () => {
    render(<TemplateEditorView id={t.id} />);
    fireEvent.click(screen.getByRole('button', { name: /add trim/i }));
    expect(await screen.findByText(/selectors are required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^publish/i })).toBeDisabled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('sends the version it loaded as the precondition, and never the payload server fields', async () => {
    render(<TemplateEditorView id={t.id} />);
    edit();
    fireEvent.click(screen.getByRole('button', { name: /^publish/i }));
    await waitFor(() => expect(publish).toHaveBeenCalled());
    const { payload, version } = publish.mock.calls[0][0];
    expect(version).toBe(t.version);
    expect(payload.version).toBeUndefined();
    expect(payload.author).toBeUndefined();
    expect(payload.createdAt).toBeUndefined();
  });

  it('surfaces the worker validation errors verbatim', async () => {
    publish.mockRejectedValue({
      status: 422,
      errors: ['trim LE: "mpg_city" above maximum 200'],
    });
    render(<TemplateEditorView id={t.id} />);
    edit();
    fireEvent.click(screen.getByRole('button', { name: /^publish/i }));
    expect(
      await screen.findByText('trim LE: "mpg_city" above maximum 200'),
    ).toBeInTheDocument();
  });

  it('explains a conflict instead of retrying over the top of it', async () => {
    publish.mockRejectedValue({ status: 409, conflict: { expected: 10, actual: 12 } });
    render(<TemplateEditorView id={t.id} />);
    edit();
    fireEvent.click(screen.getByRole('button', { name: /^publish/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('version 12');
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('reports the normalisation when a typed value is not what gets stored', () => {
    render(<TemplateEditorView id={t.id} />);
    const input = within(screen.getByTestId('cell-fuel_tank_capacity_gal-0')).getByRole(
      'textbox',
    );
    fireEvent.change(input, { target: { value: '16.000000' } });
    fireEvent.blur(input);
    expect(
      screen.getByText(/What the editor changed that you did not type/),
    ).toBeInTheDocument();
    expect(screen.getByText(/stored as the number 16/)).toBeInTheDocument();
  });

  it('is read only, with no publish button, when a proposal is required', () => {
    bundle = {
      ...authorBundle(),
      entitlement: {
        kind: 'proposal-required',
        canPublish: false,
        canSetHardwareTemplateId: false,
        mintedVehicles: 4212,
        reason: '4,212 minted vehicles resolve to this template.',
      },
    };
    render(<TemplateEditorView id={t.id} />);
    expect(screen.queryByRole('button', { name: /^publish/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add trim/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove trim/i })).toBeNull();
    // The grid renders values as text rather than fields, and the selector
    // editor keeps its labelled fields but marks every one readonly. The
    // guarantee is that nothing on the page is editable, not that nothing has
    // a textbox role.
    expect(
      within(screen.getByTestId('cell-mpg_city-0')).queryByRole('textbox'),
    ).toBeNull();
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    screen
      .queryAllByRole('textbox')
      .forEach((field) => expect(field).toHaveAttribute('readonly'));
  });
});
