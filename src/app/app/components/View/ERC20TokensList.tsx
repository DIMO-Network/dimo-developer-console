import React from 'react';

interface ERC20TokensListProps {
    tokens: Array<{ symbol: string; balance: string }>;
}

const ERC20TokensList: React.FC<ERC20TokensListProps> = ({ tokens }) => {
    return (
        <div className="erc20-tokens">
            <h4>Your ERC20 Tokens</h4>
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

export default ERC20TokensList;
