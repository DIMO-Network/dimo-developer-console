import { type FC } from 'react';
import classNames from 'classnames';

import { IconProps } from '@/components/Icons';
import { Card } from '@/components/Card';

import './PaymentMethod.css';

interface IProps {
  className?: string;
  method: string;
  selected?: boolean;
  Icon: FC<IconProps>;
  onClick?: () => void;
}

export const PaymentMethod: FC<IProps> = ({
  method,
  className = '',
  Icon,
  selected = false,
  onClick = () => {},
}) => {
  return (
    <Card
      className={classNames('payment-method card-border !p-2', className, {
        'border !border-primary-500': selected,
      })}
      onClick={onClick}
    >
      <span className="method-icon">
        <Icon className="w-5 h-5" />
      </span>
      <p className="method-name">{method}</p>
    </Card>
  );
};

export default PaymentMethod;
