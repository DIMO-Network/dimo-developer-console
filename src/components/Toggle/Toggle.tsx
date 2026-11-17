import { useTranslations } from 'next-intl';
import { useState, type FC } from 'react';
import { Switch } from '@/components/ui/switch';

interface IProps {
  checked?: boolean;
  onToggle?: (v: boolean) => void;
}

export const Toggle: FC<IProps> = ({ checked = false, onToggle = () => {} }) => {
  const t = useTranslations('common');
  const [enabled, setEnabled] = useState(checked);

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    onToggle(value);
  };

  return (
    <Switch
      checked={enabled}
      onCheckedChange={handleToggle}
      aria-label={t('toggle.label')}
    />
  );
};

export default Toggle;
