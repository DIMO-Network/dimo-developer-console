import { forwardRef, type FC } from 'react';
import { useAccount } from 'wagmi';
import { Control, Controller } from 'react-hook-form';

import { IconProps, WalletIcon } from '@/components/Icons';
import { PaymentMethod } from '@/components/PaymentMethodSelector/PaymentMethod';
import { PlusIcon } from '@heroicons/react/24/solid';
import { shortenAddress } from '@/utils/user';

import './PaymentMethodSelector.css';

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
    const { address, isConnected } = useAccount();

    return (
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value: currentValue } }) => {
          return (
            <div className="payment-method-selector">
              {isConnected && (
                <PaymentMethod
                  className="bg-dark-grey-950"
                  selected={currentValue?.type === 'wallet'}
                  method={shortenAddress(address as string)}
                  Icon={WalletIcon}
                  onClick={() => {
                    onChange({ type: 'wallet', id: address });
                  }}
                />
              )}
              <PaymentMethod
                className="border-dashed"
                method="Add a card"
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
