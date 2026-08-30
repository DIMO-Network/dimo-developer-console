import { render, screen, fireEvent, within } from '@testing-library/react';
import camry from '@/utils/__fixtures__/toyota_camry_2020.json';
import { vehicleVocab } from '@/utils/__fixtures__/vehicleVocab';
import { TrimGrid } from '@/components/TemplateEditor/TrimGrid';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;
const noop = () => {};

const renderGrid = (props: Partial<React.ComponentProps<typeof TrimGrid>> = {}) =>
  render(
    <TrimGrid
      template={t}
      vocab={vehicleVocab}
      onChange={noop}
      onNormalise={noop}
      {...props}
    />,
  );

describe('TrimGrid', () => {
  it('gives every trim a column and every vocabulary attribute a row', () => {
    renderGrid();
    // Compared as a set, not one getByRole per name: the Camry ships LE, XLE
    // and Hybrid LE, so a name regex matches three columns.
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers.slice(0, 2)).toEqual(['Attribute', 'Values']);
    expect(headers.slice(2)).toHaveLength(t.trims.length);
    t.trims.forEach((trim, i) => expect(headers[i + 2]).toContain(trim.name));

    const rows = screen.getAllByRole('rowheader').map((h) => h.textContent);
    expect(rows).toHaveLength(vehicleVocab.attributes.length);
    vehicleVocab.attributes.forEach((a, i) => expect(rows[i]).toContain(a.label));
  });

  it('mutes agreement and advances difference', () => {
    renderGrid();
    // powertrain_type differs across the Camry's ten trims: full contrast.
    const diverging = screen.getByTestId('cell-powertrain_type-0');
    expect(diverging.className).toContain('text-white');
    expect(diverging.className).not.toContain('text-white/');
    // number_of_doors is shared by every trim: muted.
    expect(screen.getByTestId('shared-number_of_doors').className).toContain(
      'text-white/40',
    );
  });

  it('shows an em dash, not an empty cell, where nothing is set', () => {
    renderGrid({ readOnly: true });
    const cell = screen.getByTestId('shared-emissions_standard');
    expect(cell).toHaveTextContent('—');
    expect(cell.className).toContain('text-white/25');
  });

  it('reads the divergence count off the rail, and offers no lift while trims disagree', () => {
    renderGrid();
    expect(screen.getByTestId('rail-powertrain_type')).toHaveTextContent('2');
    expect(
      within(screen.getByTestId('rail-powertrain_type')).queryByRole('button'),
    ).toBeNull();
  });

  it('offers Move to shared once every trim agrees, and lifts on click', () => {
    const onChange = jest.fn();
    const agreed = {
      ...t,
      attributes: {},
      trims: t.trims.map((trim) => ({
        ...trim,
        attributes: { ...trim.attributes, number_of_doors: 4 },
      })),
    } as Template;
    render(
      <TrimGrid
        template={agreed}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={noop}
      />,
    );
    fireEvent.click(
      within(screen.getByTestId('rail-number_of_doors')).getByRole('button', {
        name: /move to shared/i,
      }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ number_of_doors: 4 }),
      }),
    );
  });

  it('marks a trim with no effective selector, which is gate 4', () => {
    const broken = {
      ...t,
      trims: [
        ...t.trims,
        { name: 'XLE V6', attributes: {}, selectors: { manufacturerCode: [''] } },
      ],
    } as Template;
    render(
      <TrimGrid
        template={broken}
        vocab={vehicleVocab}
        onChange={noop}
        onNormalise={noop}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /XLE V6/ });
    expect(header).toHaveTextContent('no selector');
    expect(within(header).getByText('no selector').className).toContain('text-red-400');
  });

  it('offers exactly the vocabulary options for an enum, plus not set', () => {
    renderGrid();
    const select = within(screen.getByTestId('cell-powertrain_type-0')).getByRole(
      'combobox',
    );
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['—', 'ICE', 'HEV', 'PHEV', 'BEV', 'FCEV']);
  });

  it('types a value, reports the reparse, and never stores the text', () => {
    const onChange = jest.fn();
    const onNormalise = jest.fn();
    render(
      <TrimGrid
        template={t}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={onNormalise}
      />,
    );
    const input = within(screen.getByTestId('cell-fuel_tank_capacity_gal-0')).getByRole(
      'textbox',
    );
    fireEvent.change(input, { target: { value: '15.800000' } });
    fireEvent.blur(input);
    expect(onChange.mock.calls[0][0].trims[0].attributes.fuel_tank_capacity_gal).toBe(
      15.8,
    );
    expect(onNormalise).toHaveBeenCalledWith(
      expect.objectContaining({ attribute: 'fuel_tank_capacity_gal', to: 15.8 }),
    );
  });

  it('clearing a cell removes the attribute and says so', () => {
    const onChange = jest.fn();
    const onNormalise = jest.fn();
    render(
      <TrimGrid
        template={t}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={onNormalise}
      />,
    );
    const input = within(screen.getByTestId('cell-mpg_city-0')).getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect('mpg_city' in onChange.mock.calls[0][0].trims[0].attributes).toBe(false);
    expect(onNormalise).toHaveBeenCalledWith(expect.objectContaining({ to: null }));
  });

  it('refuses an out-of-range value in the worker words and does not change the template', () => {
    const onChange = jest.fn();
    render(
      <TrimGrid
        template={t}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={noop}
      />,
    );
    const cell = screen.getByTestId('cell-mpg_city-0');
    fireEvent.change(within(cell).getByRole('textbox'), { target: { value: '400' } });
    fireEvent.blur(within(cell).getByRole('textbox'));
    expect(onChange).not.toHaveBeenCalled();
    expect(cell).toHaveTextContent('trim LE: "mpg_city" above maximum 200');
  });

  it('renders no inputs when read only', () => {
    renderGrid({ readOnly: true });
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  });
});
