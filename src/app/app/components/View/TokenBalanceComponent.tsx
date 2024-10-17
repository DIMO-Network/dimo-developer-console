import React from 'react';
import TokenBalance from '@/components/TokenBalance/TokenBalance';

interface TokenBalanceComponentProps {
    balance: string;
    exchangeRate: number;
}

const TokenBalanceComponent: React.FC<TokenBalanceComponentProps> = ({ balance, exchangeRate }) => {
    return (
        <TokenBalance
            token="dcx"
            balance={balance}
            exchangeRate={exchangeRate}
            canBuy={true}
        />
    );
};

export default TokenBalanceComponent;
