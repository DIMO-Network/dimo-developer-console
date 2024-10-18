import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';

interface Props {
    balance: string;
    exchangeRate: number;
}

const TokenBalanceComponent: FC<Props> = ({ balance, exchangeRate }) => {
    return (
        <Card className="token-balance-card">
            <Title component="h3" className="text-lg">
                Your Token Balance
            </Title>
            <p>{balance} DCX</p>
            <p>USD Equivalent: {(parseFloat(balance) * exchangeRate).toFixed(2)} USD</p>
        </Card>
    );
};

export default TokenBalanceComponent;
