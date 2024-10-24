import { FC } from 'react';

interface Token {
    symbol: string;
    balance: string;
}

interface DimoAndDcxTokensListProps {
    tokens: Token[];
}

const DimoAndDcxTokensList: FC<DimoAndDcxTokensListProps> = ({ tokens }) => {
    return (
        <div className="dimo-dcx-tokens-list">
            <h4>Your DIMO and DCX Tokens</h4>
            <ul>
                {tokens.map((token) => (
                    <li key={token.symbol}>
                        <span>{token.symbol}</span>: <span>{token.balance}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DimoAndDcxTokensList;
