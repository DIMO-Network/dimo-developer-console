import { useState, type FC } from 'react';
import { Switch } from '@/components/ui/switch';

interface IProps {
  checked?: boolean;
  onToggle?: (v: boolean) => void;
}

export const Toggle: FC<IProps> = ({ checked = false, onToggle = () => {} }) => {
  const [enabled, setEnabled] = useState(checked);

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    onToggle(value);
  };

  return <Switch checked={enabled} onCheckedChange={handleToggle} aria-label="toggle" />;
};

export default Toggle;
