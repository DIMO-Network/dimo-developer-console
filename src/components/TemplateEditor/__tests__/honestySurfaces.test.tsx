import { render, screen, fireEvent } from '@testing-library/react';
import camry from '@/utils/__fixtures__/toyota_camry_2020.json';
import { NormalisationPanel } from '@/components/TemplateEditor/NormalisationPanel';
import { TrimSelectorEditor } from '@/components/TemplateEditor/TrimSelectorEditor';
import { EntitlementBanner } from '@/components/TemplateEditor/EntitlementBanner';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;

describe('NormalisationPanel', () => {
  it('renders nothing when the editor changed nothing', () => {
    const { container } = render(<NormalisationPanel notes={[]} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says what was stored instead of what was typed', () => {
    render(
      <NormalisationPanel
        notes={[
          {
            attribute: 'fuel_tank_capacity_gal',
            from: '15.800000',
            to: 15.8,
            reason: 'stored as the number 15.8, not the text "15.800000"',
          },
          {
            attribute: 'mpg_city',
            from: '',
            to: null,
            reason: 'cleared — the attribute is removed, not stored empty',
          },
        ]}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText(/stored as the number 15.8/)).toBeInTheDocument();
    expect(
      screen.getByText(/the attribute is removed, not stored empty/),
    ).toBeInTheDocument();
  });
});

describe('TrimSelectorEditor', () => {
  it('shows the gate 4 state for a trim with no effective selector', () => {
    const broken = {
      ...t,
      trims: [
        ...t.trims,
        { name: 'XLE V6', attributes: {}, selectors: { vinPattern: '  ' } },
      ],
    } as Template;
    render(
      <TrimSelectorEditor
        template={broken}
        trimIndex={broken.trims.length - 1}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A template with more than one trim cannot have a selector-less trim',
    );
  });

  it('is quiet when the trim has a real selector', () => {
    render(<TrimSelectorEditor template={t} trimIndex={0} onChange={() => {}} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('splits a comma separated list into manufacturer codes and drops the blanks', () => {
    const onChange = jest.fn();
    render(<TrimSelectorEditor template={t} trimIndex={0} onChange={onChange} />);
    const field = screen.getByLabelText(/manufacturer code/i);
    fireEvent.change(field, { target: { value: '2532, , 2533 ' } });
    fireEvent.blur(field);
    expect(onChange.mock.calls.at(-1)![0].trims[0].selectors.manufacturerCode).toEqual([
      '2532',
      '2533',
    ]);
  });

  it('keeps the separator, so a second value can actually be typed', () => {
    // The field was controlled by the joined list while the change handler
    // re-parsed every keystroke, so the comma was deleted the instant it was
    // typed and the placeholder the component shows -- "2532, 2546" -- named a
    // value the control could not produce.
    const onChange = jest.fn();
    render(<TrimSelectorEditor template={t} trimIndex={0} onChange={onChange} />);
    const field = screen.getByLabelText(/manufacturer code/i);
    expect(field).toHaveValue('2532');

    fireEvent.change(field, { target: { value: '2532,' } });
    expect(field).toHaveValue('2532,');
    fireEvent.change(field, { target: { value: '2532, 2546' } });
    expect(field).toHaveValue('2532, 2546');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(field);
    expect(onChange.mock.calls.at(-1)![0].trims[0].selectors.manufacturerCode).toEqual([
      '2532',
      '2546',
    ]);
  });

  it('lets the field be cleared and retyped without emptying the selector mid-edit', () => {
    // Clearing first was the only workaround for the eaten separator, and it
    // stored manufacturerCode: [] on the way -- which trips the multi-trim
    // selector-less trim error on a template that is perfectly fine.
    const onChange = jest.fn();
    render(<TrimSelectorEditor template={t} trimIndex={0} onChange={onChange} />);
    const field = screen.getByLabelText(/manufacturer code/i);
    fireEvent.change(field, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '2546' } });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].trims[0].selectors.manufacturerCode).toEqual([
      '2546',
    ]);
  });

  it('leaves a stored value containing a comma alone through a focus and a blur', () => {
    // The same round trip split an existing styleName on its comma the moment
    // the field was touched, changing which VINs the trim claims.
    const onChange = jest.fn();
    const withComma = {
      ...t,
      trims: [
        { ...t.trims[0], selectors: { styleName: ['LE, Convenience Package'] } },
        ...t.trims.slice(1),
      ],
    } as Template;
    render(<TrimSelectorEditor template={withComma} trimIndex={0} onChange={onChange} />);
    const field = screen.getByLabelText(/style name/i);
    expect(field).toHaveValue('LE, Convenience Package');
    fireEvent.focus(field);
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveValue('LE, Convenience Package');
  });
});

describe('EntitlementBanner', () => {
  it('explains a proposal requirement and names the vehicle count', () => {
    render(
      <EntitlementBanner
        entitlement={{
          kind: 'proposal-required',
          canPublish: false,
          canSetHardwareTemplateId: false,
          mintedVehicles: 4212,
          reason: '4,212 minted vehicles resolve to this template.',
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '4,212 minted vehicles resolve to this template.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('read only');
  });

  it('reads as read only, and says why, when the vehicle count could not be verified', () => {
    render(
      <EntitlementBanner
        entitlement={{
          kind: 'unavailable',
          canPublish: false,
          canSetHardwareTemplateId: false,
          mintedVehicles: null,
          reason: 'Could not verify the vehicle count for this template. Try again.',
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Access could not be verified');
    expect(screen.getByRole('status')).toHaveTextContent('read only');
    expect(screen.getByRole('status')).toHaveTextContent('Try again');
  });

  it('says nothing loud when the caller may publish', () => {
    render(
      <EntitlementBanner
        entitlement={{
          kind: 'author',
          canPublish: true,
          canSetHardwareTemplateId: false,
          mintedVehicles: 0,
          reason: 'No vehicle references this template yet.',
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'No vehicle references this template yet.',
    );
    expect(screen.getByRole('status').className).not.toContain('red');
  });
});
