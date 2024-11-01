import { forwardRef, type FC } from 'react';
import { Control, Controller } from 'react-hook-form';

import { IconProps, WalletIcon } from '@/components/Icons';
import { PaymentMethod } from '@/components/PaymentMethodSelector/PaymentMethod';
import { PlusIcon } from '@heroicons/react/24/solid';

import './PaymentMethodSelector.css';
import classNames from 'classnames';

interface IProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any>;
}

export type Ref = HTMLInputElement;

// eslint-disable-next-line react/display-name
export const PaymentMethodSelector: FC<IProps> = forwardRef<Ref, IProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ name, control }, _ref) => {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value: currentValue } }) => {
          return (
            <div className="payment-method-selector">
              <PaymentMethod
                className={classNames('payment-method', {
                  selected: currentValue?.type === 'wallet',
                })}
                selected={currentValue?.type === 'wallet'}
                method="Buy with DIMO"
                Icon={WalletIcon}
                onClick={() => {
                  onChange({ type: 'wallet' });
                }}
              />
              <PaymentMethod
                className={classNames('payment-method', {
                  selected: currentValue?.type === 'usd',
                })}
                selected={currentValue?.type === 'usd'}
                method="Buy with USD"
                onClick={() => {
                  onChange({ type: 'usd' });
                }}
                Icon={PlusIcon as FC<IconProps>}
              />
            </div>
          );
        }}
      />
    );
  },
);

export default PaymentMethodSelector;
