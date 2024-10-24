'use client';
import { FC, useEffect, useState } from 'react';
import { createPublicClient } from 'viem';
import { ContractType } from '@dimo-network/transactions';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { getMyApps } from '@/services/app';
import ERC20TokensList from './ERC20TokensList';
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import TokenBalanceComponent from './TokenBalanceComponent';
import './View.css';
import * as http from "http";
import { polygonAmoy } from "viem/chains";

// Import contract mapping from transactions SDK
import {
    CHAIN_ABI_MAPPING,
    ENVIRONMENT,
    ENV_MAPPING,
} from '@dimo-network/transactions';

// Use environment mapping
export const contractMapping =
    CHAIN_ABI_MAPPING[ENV_MAPPING.get(process.env.NEXT_PUBLIC_ENV ?? "dev") ?? ENVIRONMENT.PROD].contracts;

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding();
    const { organizationInfo } = useGlobalAccount();
    const [erc20Tokens, setErc20Tokens] = useState<Array<{ symbol: string; balance: string }>>([]);
    const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const [dimoBalance, setDimoBalance] = useState<string>('0');

    // Create the public client (RPC)
    const publicClient = createPublicClient({
        transport: http('https://rpc.zerodev.app/api/v2/bundler/f4d1596a-edfd-4063-8f99-2d8835e07739'),
        chain: polygonAmoy,
    });

    // Function to fetch DIMO balance using `balanceOf`
    const fetchDimoBalance = async (userAddress: string) => {
        try {
            // Read directly from contract using publicClient
            const balance = await publicClient.readContract({
                address: contractMapping[ContractType.DIMO_TOKEN].address,
                abi: contractMapping[ContractType.DIMO_TOKEN].abi,
                functionName: 'balanceOf',
                args: [userAddress],
            });

            setDimoBalance(balance);
        } catch (error) {
            console.error('Error fetching DIMO balance:', error);
        }
    };

    const fetchERC20Tokens = async (accountAddress: string) => {
        try {
            const accountBalances = await publicClient.readContract({
                address: contractMapping[ContractType.DIMO_TOKEN].address,
                abi: contractMapping[ContractType.DIMO_TOKEN].abi,
                functionName: 'balanceOf',
                args: [accountAddress],
            });

            const tokenData = accountBalances.map(token => ({
                symbol: token.token.symbol,
                balance: token.balance,
            }));

            setErc20Tokens(tokenData);
        } catch (error) {
            console.error('Error fetching ERC20 token balances:', error);
        }
    };

    useEffect(() => {
        if (isOnboardingCompleted) {
            const fetchAppsAndTokens = async () => {
                try {
                    const response = await getMyApps();
                    setApps(response.results);

                    const accountAddress = organizationInfo.walletAddress;
                    await fetchERC20Tokens(accountAddress);

                    // Fetch DIMO balance for the same account
                    await fetchDimoBalance(accountAddress);
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

                    {/* Display DIMO Balance */}
                    <div className="dimo-balance">
                        <h4>Your DIMO Token Balance</h4>
                        <p>{dimoBalance} DIMO</p>
                    </div>

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
                            <AppsList apps={apps} />
                        </>
                    )}

                    {/* Scenario 4: Apps created, DCX balance > 0 */}
                    {hasDCXBalance && hasApps && (
                        <>
                            <AppsList apps={apps} />
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
