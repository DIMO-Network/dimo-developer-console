import './TokenBalance.css';
import { BuyDcxIcon } from '@/components/Icons';
import {
  formatSimpleBalance,
  formatSimpleBalanceWithDigits,
} from '@/utils/formatBalance';
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
  canBuy,
  openBuyModal,
  iconClassName,
}: IProps) => {
  return (
    <div className="token-balance">
      <div className={'flex flex-row gap-4 items-center'}>
        <div className={classNames('token-balance__icon', iconClassName)}>
          <img alt={token} src={`/images/${token}_token_icon.svg`} />
        </div>
        <div className="token-balance__balance">
          <BalanceDisplay
            balance={formatSimpleBalanceWithDigits(balance, 3)}
            unitsDisplay={token.toUpperCase()}
          />
          <BalanceDisplay
            balance={formatSimpleBalance(balance * basePrice)}
            unitsDisplay={'USD'}
          />
        </div>
      </div>
      {canBuy && (
        <Button title="Buy DCX" className="dark" onClick={openBuyModal}>
          Buy DCX
        </Button>
      )}
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
    <p className={'text-3xl font-medium'}>{balance}</p>
    <p className={'text-base font-medium text-text-secondary'}>{unitsDisplay}</p>
  </div>
);

export default TokenBalance;
