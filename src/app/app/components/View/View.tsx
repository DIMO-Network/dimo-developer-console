'use client';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { createKernelDefiClient } from '@zerodev/defi';
import { getMyApps, getMyApp } from '@/services/app';
import { ethers } from 'ethers';
import ERC20TokensList from './ERC20TokensList';
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import TokenBalanceComponent from './TokenBalanceComponent';
import { createKernelAccountClient } from "@zerodev/sdk";
import { http } from "viem";
import { polygonAmoy } from 'viem/chains';
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { createKernelAccount } from "@zerodev/sdk";
import './View.css';

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding();
    const [erc20Tokens, setErc20Tokens] = useState<Array<{ symbol: string; balance: string }>>([]);
    const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const router = useRouter();
    const entryPoint = ENTRYPOINT_ADDRESS_V07;


    const account = createKernelAccount(publicClient);

    const kernelClient = createKernelAccountClient({
        account,
        entryPoint,

        chain: polygonAmoy,

        // Replace with your bundler RPC.
        // For ZeroDev, you can find the RPC on your dashboard.
        bundlerTransport: http('BUNDLER_RPC'),

    });

    const projectId = '<PROJECT_ID>';
    const defiClient = createKernelDefiClient(kernelClient, projectId);

    const fetchERC20Tokens = async (accountAddress: string, chainId: number) => {
        try {
            const accountBalances = await defiClient.listTokenBalances({
                account: accountAddress,
                chainId,
            });

            const tokenData = accountBalances.map(token => ({
                symbol: token.token.symbol,
                balance: ethers.utils.formatUnits(token.balance, token.token.decimals),
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
    const hasDCXBalance = erc20Tokens.some(token => token.symbol === 'DCX' && token.balance > 0);
    const exchangeRate = 0.001;

    return (
        <div className="home-page">
            {isLoading || loadingApps ? (
                <div>Loading...</div>
            ) : (
                <>
                    {/* Display ERC20 Tokens */}
                    <ERC20TokensList tokens={erc20Tokens} />

                    {/* Welcome Message */}
                    <div className="welcome-message">
                        <p className="title">Welcome to DIMO Developer Console</p>
                        <p className="sub-message">
                            {hasDCXBalance && !hasApps
                                ? "You have credits! Now it's time to create your first application."
                                : "Learn how to get started with the DIMO API"}
                        </p>
                    </div>

                    {/* Scenario 1: No DCX balance, no apps created */}
                    {!hasDCXBalance && !hasApps && (
                        <>
                            <OnboardingSection />
                            <GetStartedSection />
                        </>
                    )}

                    {/* Scenario 2: DCX balance > 0, no apps created */}
                    {hasDCXBalance && !hasApps && (
                        <>
                            <GetStartedSection />
                        </>
                    )}

                    {/* Scenario 3: Apps created, but DCX balance = 0 */}
                    {!hasDCXBalance && hasApps && (
                        <>
                            <AttentionBox />
                            <AppsList apps={apps} onAppClick={handleAppClick} />
                        </>
                    )}

                    {/* Scenario 4: Apps created, DCX balance > 0 */}
                    {hasDCXBalance && hasApps && (
                        <>
                            <AppsList apps={apps} onAppClick={handleAppClick} />
                            <TokenBalanceComponent
                                balance={erc20Tokens.find(token => token.symbol === 'DCX')?.balance ?? '0'}
                                exchangeRate={exchangeRate}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default View;
