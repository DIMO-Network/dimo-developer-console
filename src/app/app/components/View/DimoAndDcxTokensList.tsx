import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import './View.css';

interface Token {
  symbol: string;
  balance: string;
}

interface Props {
  tokens: Token[];
  exchangeRate: number; // Adding exchange rate as a prop
}

const DimoAndDcxTokensList: FC<Props> = ({ tokens, exchangeRate }) => {
  return (
    <div>
      <Title component="h2" className="text-lg">
        Your Tokens
      </Title>
      {tokens.length > 0 ? (
        <div className="token-list">
          {tokens.map((token) => (
            <Card key={token.symbol} className="token-card">
              <p>{token.symbol}</p>
              <p>
                {token.balance} {token.symbol}
              </p>
              <p>
                Equivalent USD: $
                {(parseFloat(token.balance) * exchangeRate).toFixed(2)}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <p>No tokens found.</p>
      )}
    </div>
  );
};

export default DimoAndDcxTokensList;
