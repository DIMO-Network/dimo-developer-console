import { type FC } from 'react';

import './Option.css';

export interface RenderParams {
  value: string;
  selected?: boolean;
}

export interface OptionItem {
  render: FC<RenderParams>;
  value: string;
  selected?: boolean;
}

export interface Interaction {
  onChange: (s: string) => void;
}

export const Option: FC<OptionItem & Interaction> = ({
  render,
  value,
  onChange,
  selected,
}) => {
  return (
    <div onClick={() => onChange(value)} key={value}>
      {render({ value, selected })}
    </div>
  );
};

export default Option;
