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
    fireEvent.change(screen.getByLabelText(/manufacturer code/i), {
      target: { value: '2532, , 2533 ' },
    });
    expect(onChange.mock.calls.at(-1)![0].trims[0].selectors.manufacturerCode).toEqual([
      '2532',
      '2533',
    ]);
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
