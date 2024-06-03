import { useState, type FC } from 'react';
import { Switch } from '@headlessui/react';
import classNames from 'classnames';

import './Toggle.css';

interface IProps {
  checked?: boolean;
  onToggle?: (v: boolean) => void;
}

export const Toggle: FC<IProps> = ({
  checked = false,
  onToggle = () => {},
}) => {
  const [enabled, setEnabled] = useState(checked);

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    onToggle(value);
  };
  return (
    <Switch
      checked={enabled}
      onChange={handleToggle}
      className="custom-toggle group"
      aria-label="toggle"
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className="base"
      />
      <span
        aria-hidden="true"
        className={classNames({ active: enabled, inactive: !enabled }, 'bar')}
      />
      <span
        aria-hidden="true"
        className={classNames({ active: enabled, inactive: !enabled }, 'dot')}
      />
    </Switch>
  );
};

export default Toggle;
