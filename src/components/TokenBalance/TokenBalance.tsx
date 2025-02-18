import './TokenBalance.css';
import { BuyDcxIcon } from '@/components/Icons';
import {
  formatSimpleBalance,
  formatSimpleBalanceWithDigits,
} from '@/utils/formatBalance';

interface IProps {
  token: string;
  balance: number;
  basePrice: number;
  canBuy: boolean;
  openBuyModal?: () => void;
}

export const TokenBalance = ({
  token,
  balance,
  basePrice,
  canBuy,
  openBuyModal,
}: IProps) => {
  return (
    <div className="token-balance">
      <div className="token-balance__icon">
        <img alt={token} src={`/images/${token}_token_icon.svg`} />
      </div>
      <div className="token-balance__balance">
        <div className="token-balance__balance-container">
          <span className="text-sm font-bold">
            {formatSimpleBalance(balance * basePrice)} USD
          </span>
          <span className="text-sm ">{`${formatSimpleBalanceWithDigits(balance, 3)} ${token.toUpperCase()}`}</span>
        </div>
      </div>
      {canBuy && (
        <button title="Buy DCX" className="token-balance__buy-button" onClick={openBuyModal}>
          <BuyDcxIcon />
        </button>
      )}
    </div>
  );
};

export default TokenBalance;
