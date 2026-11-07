import { useTranslations } from 'next-intl';
import { FC } from 'react';
import { capitalize } from 'lodash';

import { StatusChip, type StatusTone } from '@/components/StatusChip';

interface Props {
  status: string;
}

export const StatusBadge: FC<Props> = ({ status }) => {
  const t = useTranslations('common');
  const getTone = (): StatusTone => {
    switch (status.toLowerCase()) {
      case 'enabled':
        return 'live';
      case 'failed':
        return 'error';
      case 'disabled':
      default:
        return 'off';
    }
  };

  const known = ['enabled', 'disabled', 'failed'].includes(status.toLowerCase());
  const label = known ? t(`webhooks.status.${status.toLowerCase()}`) : capitalize(status);
  return <StatusChip tone={getTone()}>{label}</StatusChip>;
};
