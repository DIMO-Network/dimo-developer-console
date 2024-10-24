'use client';
import { FC, useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
//import { useContractGA } from '@/hooks/useContractGA';  //santi merge PR
import { getMyApps } from '@/services/app';
import DimoAndDcxTokensList from './DimoAndDcxTokensList';
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import TokenBalanceComponent from './TokenBalanceComponent';
import './View.css';

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding();
    //const { balanceDimo, balanceDCX } = useContractGA();  // Get balances using the hook
    const balanceDimo = '1000';  // Hardcode for testing for now
    const balanceDCX = '500';
    const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(true);

    useEffect(() => {
        if (isOnboardingCompleted) {
            const fetchApps = async () => {
                try {
                    const response = await getMyApps();
                    setApps(response.results);
                } catch (error) {
                    console.error('Error fetching apps:', error);
                } finally {
                    setLoadingApps(false);
                }
            };

            fetchApps();
        }
    }, [isOnboardingCompleted]);

    const hasApps = apps.length > 0;
    const hasDCXBalance = parseFloat(balanceDCX) > 0;
    const exchangeRate = 0.001;

    return (
        <div className="home-page">
            {isLoading || loadingApps ? (
                <div>Loading...</div>
            ) : (
                <>
                    {/* Display ERC20 Tokens */}
                    <DimoAndDcxTokensList tokens={[{ symbol: 'DIMO', balance: balanceDimo }, { symbol: 'DCX', balance: balanceDCX }]} />

                    {/* Display DIMO Balance */}
                    <div className="dimo-balance">
                        <h4>Your DIMO Token Balance</h4>
                        <p>{balanceDimo} DIMO</p>
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
                                balance={balanceDCX}
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
