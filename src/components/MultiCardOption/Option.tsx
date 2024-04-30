import { type FC } from 'react';
import classNames from 'classnames';

import { Card } from '@/components/Card';

import './Option.css';

export interface OptionItem {
  render: FC;
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
    <Card
      className={classNames('card-border option-card', {
        '!border-white': selected,
      })}
      onClick={() => onChange(value)}
      key={value}
    >
      {render({ value })}
    </Card>
  );
};

export default Option;
