import { FC } from 'react';
import { capitalize } from 'lodash';

import { StatusChip, type StatusTone } from '@/components/StatusChip';

interface Props {
  status: string;
}

export const StatusBadge: FC<Props> = ({ status }) => {
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

  return <StatusChip tone={getTone()}>{capitalize(status)}</StatusChip>;
};
