import { type FC } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { IconProps, WalletIcon } from '@/components/Icons';
import { PaymentMethod } from '@/components/PaymentMethodSelector/PaymentMethod';
import { PlusIcon } from '@heroicons/react/24/solid';

import './PaymentMethodSelector.css';
import classNames from 'classnames';

interface IProps<T extends FieldValues> {
  name: string;
  control: Control<T>;
}

export type Ref = HTMLInputElement;

// Generic over the form, so any form's control fits.
export const PaymentMethodSelector = <T extends FieldValues>({
  name,
  control,
}: IProps<T>) => {
  return (
    <Controller
      name={name as Path<T>}
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
};

export default PaymentMethodSelector;
