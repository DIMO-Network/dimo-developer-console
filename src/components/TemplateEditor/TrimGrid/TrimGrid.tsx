import React, { type FC } from 'react';
import type { DeviceType, Template } from '@/types/template';
import type { Normalisation } from '@/utils/templateCoerce';
import {
  buildGrid,
  clearShared,
  clearTrimValue,
  liftToShared,
  setShared,
  setTrimValue,
} from '@/utils/templateGrid';
import { DivergenceRail } from '@/components/TemplateEditor/DivergenceRail';
import { TemplateCell } from './TemplateCell';
import { TrimHeader } from './TrimHeader';

export interface TrimGridProps {
  template: Template;
  vocab: DeviceType;
  readOnly?: boolean;
  onChange: (next: Template) => void;
  onNormalise: (note: Normalisation) => void;
}

export const TrimGrid: FC<TrimGridProps> = ({
  template,
  vocab,
  readOnly,
  onChange,
  onNormalise,
}) => {
  const grid = buildGrid(template, vocab);
  const multiTrim = template.trims.length > 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-cta-default bg-surface-default">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface-sunken px-3 py-2 text-left text-white/50"
            >
              Attribute
            </th>
            <th scope="col" className="px-3 py-2 text-left text-white/50">
              Values
            </th>
            {template.trims.map((trim, i) => (
              <th
                key={`${trim.name}-${i}`}
                scope="col"
                className="border-l border-cta-default align-top"
              >
                <TrimHeader trim={trim} multiTrim={multiTrim} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.def.name} className="border-t border-cta-default">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface-default px-3 py-2 text-left font-normal text-white/70"
              >
                {row.def.label}
                {row.def.unit && (
                  <span className="pl-1 text-white/40">({row.def.unit})</span>
                )}
              </th>
              <td data-testid={`rail-${row.def.name}`} className="px-3 py-2">
                <DivergenceRail
                  row={row}
                  readOnly={readOnly}
                  onLift={(n) => onChange(liftToShared(template, n))}
                />
              </td>
              {row.scope === 'trim' ? (
                template.trims.map((trim, i) => (
                  <td
                    key={`${trim.name}-${i}`}
                    className="border-l border-cta-default align-top"
                  >
                    <TemplateCell
                      def={row.def}
                      value={row.cells[i]}
                      where={`trim ${trim.name || '?'}`}
                      emphasised={row.distinct > 1}
                      readOnly={readOnly}
                      testId={`cell-${row.def.name}-${i}`}
                      onSet={(v) => onChange(setTrimValue(template, i, row.def.name, v))}
                      onClear={() => onChange(clearTrimValue(template, i, row.def.name))}
                      onNormalise={onNormalise}
                    />
                  </td>
                ))
              ) : (
                // One value, stated once, spanning every trim -- the visual form
                // of "this is true of the whole model-year".
                <td
                  colSpan={template.trims.length}
                  className="border-l border-cta-default align-top"
                >
                  <TemplateCell
                    def={row.def}
                    value={row.shared}
                    where="template"
                    emphasised={false}
                    readOnly={readOnly}
                    testId={`shared-${row.def.name}`}
                    onSet={(v) => onChange(setShared(template, row.def.name, v))}
                    onClear={() => onChange(clearShared(template, row.def.name))}
                    onNormalise={onNormalise}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
