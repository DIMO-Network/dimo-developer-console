import './TokenBalance.css';
import { BuyDcxIcon } from '@/components/Icons';

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
        <img alt={token} src={`/images/${token}_token_icon.png`} />
      </div>
      <div className="token-balance__balance">
        <div className="token-balance__balance-container">
          <span className="text-sm font-bold">
            {(balance * basePrice).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
          </span>
          <span className="text-sm ">{`${balance.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${token.toUpperCase()}`}</span>
        </div>
      </div>
      {canBuy && (
        <button className="token-balance__buy-button" onClick={openBuyModal}>
          <BuyDcxIcon />
        </button>
      )}
    </div>
  );
};

export default TokenBalance;
