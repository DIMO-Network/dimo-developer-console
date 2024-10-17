'use client';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { createKernelDefiClient } from '@zerodev/defi';
import { getMyApps, getMyApp } from '@/services/app';
import './View.css';

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding();
    const [erc20Tokens, setErc20Tokens] = useState<Array<{ symbol: string; balance: number }>>([]);
    const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const router = useRouter();


    const kernelClient = '<KERNEL_CLIENT>';
    const projectId = '<PROJECT_ID>';
    const defiClient = createKernelDefiClient(kernelClient, projectId);

    const fetchERC20Tokens = async (accountAddress: string, chainId: number) => {
        try {
            const accountBalances = await defiClient.listTokenBalances({
                account: accountAddress,
                chainId,
            });

            console.log("Token Balances:", accountBalances);

            // Assuming i need to extract the symbol and balance
            const tokenData = accountBalances.map(token => ({
                symbol: token.token.symbol,
                balance: token.balance,
            }));

            setErc20Tokens(tokenData);
        } catch (error) {
            console.error('Error fetching ERC20 token balances:', error);
        }
    };



    const handleAppClick = async (id: string) => {
        try {
            const app = await getMyApp(id);
            router.push(`/app/${app.id}`);
        } catch (error) {
            console.error('Error fetching app details:', error);
        }
    };

    useEffect(() => {
        if (isOnboardingCompleted) {
            const fetchAppsAndTokens = async () => {
                try {
                    const response = await getMyApps();
                    setApps(response.results);

                    const accountAddress = '<USER_GLOBAL_ACCOUNT_ADDRESS>';
                    const chainId = 1;
                    await fetchERC20Tokens(accountAddress, chainId);
                } catch (error) {
                    console.error('Error fetching apps or tokens:', error);
                } finally {
                    setLoadingApps(false);
                }
            };

            fetchAppsAndTokens();
        }
    }, [isOnboardingCompleted]);

    const hasApps = apps.length > 0;

    return (
        <div className="home-page">
            {/* Loading State */}
            {(isLoading || loadingApps) && <div>Loading...</div>}
                <>
                    <div className="erc20-tokens">
                        <h4>Your ERC20 Tokens</h4>
                        <ul>
                            {erc20Tokens.map((token) => (
                                <li key={token.symbol}>
                                    <span>{token.symbol}</span>: <span>{token.balance}</span>
                                </li>
                            ))}
                        </ul>
                    </div>


                    {/* Scenario 1: No DCX balance, no apps, and onboarding not completed */}
                    {!hasDCXBalance && !hasApps && !isOnboardingCompleted && (
                        <div className="welcome-message">
                            <p className="title">Welcome to DIMO Developer Console</p>
                            <p className="sub-message">
                                Learn how to get started with the{' '}
                                <span className="text-primary-200">DIMO API</span>
                            </p>

                            <div className="onboarding-section">
                                <h3>What are DIMO Credits (DCX)?</h3>
                                <p>
                                    DCX is a stablecoin that's pegged to one-tenth of a cent (0.001 USD),
                                    and is essential for all developers building on DIMO. For DIMO protocol fees,
                                    spending DCX or $DIMO is required.
                                </p>
                            </div>

                            <div className="get-started-section">
                                <h4>How to get started</h4>
                                <div className="get-started-options">
                                    <div className="option">
                                        <p>Purchase DCX</p>
                                        <button className="purchase-dcx-btn">Purchase DCX</button>
                                    </div>
                                    <div className="option">
                                        <p>Create an application</p>
                                        <button className="create-app-btn">Create an App</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scenario 2: DCX balance > 0, no apps created */}
                    {hasDCXBalance && !hasApps && (
                        <div className="welcome-message">
                            <p className="title">Welcome to DIMO Developer Console</p>
                            <p className="sub-message">
                                You have credits! Now it's time to{' '}
                                <span className="text-primary-200">create your first application</span>.
                            </p>

                            <TokenBalance
                                token="dcx"
                                balance={dcxBalance}
                                exchangeRate={exchangeRate}
                                canBuy={true}
                            />

                            <div className="get-started-section">
                                <h4>How to get started</h4>
                                <div className="get-started-options">
                                    <div className="option">
                                        <p>Purchase DCX</p>
                                        <span className="checkmark">✔</span>
                                    </div>
                                    <div className="option">
                                        <p>Create an application</p>
                                        <button className="create-app-btn">Create an App</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scenario 3: Apps created, but DCX balance = 0 */}
                    {!hasDCXBalance && hasApps && (
                        <div className="welcome-message">
                            <p className="title">Welcome to DIMO Developer Console</p>

                            <div className="attention-box">
                                <p className="attention-text">
                                    <span className="attention-title">Attention required:</span> Your developer
                                    account needs DCX to function properly. Please purchase more DCX to avoid service
                                    interruptions.
                                </p>
                                <button className="get-credits-btn">Get Credits</button>
                            </div>

                            <div className="apps-section">
                                <h4>Your applications</h4>
                                <div className="apps-list">
                                    {apps.map((app) => (
                                        <div key={app.id} className="app-item">
                                            <button
                                                className="app-name-btn"
                                                onClick={() => handleAppClick(app.id)}
                                            >
                                                {app.name}
                                            </button>
                                            <span className="app-status">{app.status}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="create-new-app-btn">+ Create new</button>
                            </div>
                        </div>
                    )}

                    {/* Scenario 4: Apps created, DCX balance > 0 */}
                    {hasDCXBalance && hasApps && (
                        <div className="welcome-message">
                            <p className="title">Welcome to DIMO Developer Console</p>

                            <TokenBalance
                                token="dcx"
                                balance={dcxBalance}
                                exchangeRate={exchangeRate}
                                canBuy={true}
                            />

                            <div className="apps-section">
                                <h4>Your applications</h4>
                                <div className="apps-list">
                                    {apps.map((app) => (
                                        <div key={app.id} className="app-item">
                                            <button
                                                className="app-name-btn"
                                                onClick={() => handleAppClick(app.id)}
                                            >
                                                {app.name}
                                            </button>
                                            <span className="app-status">{app.status}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="create-new-app-btn">+ Create new</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default View;
