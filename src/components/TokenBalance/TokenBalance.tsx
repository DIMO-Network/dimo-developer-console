/* eslint-disable @typescript-eslint/no-unused-vars */
import { useFormatter } from 'next-intl';
import './TokenBalance.css';
import classNames from 'classnames';
import { Button } from '@/components/Button';

interface IProps {
  token: string;
  balance: number;
  basePrice: number;
  canBuy: boolean;
  openBuyModal?: () => void;
  iconClassName?: string;
}

export const TokenBalance = ({
  token,
  balance,
  basePrice,
  canBuy: _canBuy,
  openBuyModal: _openBuyModal,
  iconClassName,
}: IProps) => {
  const format = useFormatter();
  const fixed = (value: number, digits: number) =>
    format.number(value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  return (
    <div className="token-balance">
      {/* Buy DCX disabled
      {canBuy && (
        <Button title="Buy DCX" variant="secondary" onClick={openBuyModal}>
          Buy DCX
        </Button>
      )}
      */}
      <div className={'flex flex-row gap-4 items-center'}>
        <div className={classNames('token-balance__icon', iconClassName)}>
          <img alt={token} src={`/images/${token}_token_icon.svg`} />
        </div>
        <div className="token-balance__balance">
          <BalanceDisplay
            balance={fixed(balance, 3)}
            unitsDisplay={token.toUpperCase()}
          />
          <BalanceDisplay balance={fixed(balance * basePrice, 2)} unitsDisplay={'USD'} />
        </div>
      </div>
    </div>
  );
};

const BalanceDisplay = ({
  balance,
  unitsDisplay,
}: {
  balance: string;
  unitsDisplay: string;
}) => (
  <div className={'flex flex-row items-center gap-2'}>
    <p className={'text-card-title'}>{balance}</p>
    <p className={'text-card-title text-muted'}>{unitsDisplay}</p>
  </div>
);

export default TokenBalance;
