import { type FC } from 'react';
import classnames from 'classnames';

import { type OptionItem, Option, type Interaction } from './Option';

import './MultiCardOption.css';

interface IProps {
  options: OptionItem[];
  selected: string;
  className?: string;
}

export const MultiCardOption: FC<IProps & Interaction> = ({
  options,
  selected,
  onChange,
  className = '',
}) => {
  return (
    <div className={classnames('multi-card-options', className)}>
      {options.map((optionProps) => {
        return (
          <Option
            key={optionProps.value}
            {...optionProps}
            selected={selected === optionProps.value}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
};

export default MultiCardOption;
