import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';

interface Token {
    symbol: string;
    balance: string;
}

interface Props {
    tokens: Token[];
}

const ERC20TokensList: FC<Props> = ({ tokens }) => {
    return (
        <div>
            <Title component="h2" className="text-lg">
                Your ERC20 Tokens
            </Title>
            {tokens.length > 0 ? (
                <div className="token-list">
                    {tokens.map((token) => (
                        <Card key={token.symbol} className="token-card">
                            <p>{token.symbol}: {token.balance}</p>
                        </Card>
                    ))}
                </div>
            ) : (
                <p>No ERC20 tokens found.</p>
            )}
        </div>
    );
};

export default ERC20TokensList;
