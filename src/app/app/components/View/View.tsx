'use client';
import { FC, useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
//import { useContractGA } from '@/hooks/useContractGA';  //santi merge PR
//import { getMyApps } from '@/services/app';  // Commenting out for now
import DimoAndDcxTokensList from './DimoAndDcxTokensList';
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import './View.css';

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding();
    //const { balanceDimo, balanceDCX } = useContractGA();  // Get balances using the hook
    const balanceDimo = '0';  // Hardcode for testing for now
    const balanceDCX = '0';

    // Commenting out the getMyApps-related code and hardcoding apps for testing
    // const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(false); // No need to simulate loading for now
    const hardcodedApps = [
        { id: '1', name: 'Test App 1', status: 'active' },
        //{ id: '2', name: 'Test App 2', status: 'inactive' },
    ];

    useEffect(() => {
        if (isOnboardingCompleted) {
            // const fetchApps = async () => {
            //     try {
            //         const response = await getMyApps();
            //         setApps(response.results);
            //     } catch (error) {
            //         console.error('Error fetching apps:', error);
            //     } finally {
            //         setLoadingApps(false);
            //     }
            // };

            // fetchApps();
        }
    }, [isOnboardingCompleted]);

    // Hardcode hasApps as true since we have hardcoded apps for testing
    const hasApps = hardcodedApps.length > 0;
    const hasDCXBalance = parseFloat(balanceDCX) > 0;
    const exchangeRate = 0.001;

    return (
        <div className="home-page">
            {isLoading || loadingApps ? (
                <div>Loading...</div>
            ) : (
                <>
                    {/* Display Tokens */}
                    <DimoAndDcxTokensList
                        tokens={[
                            { symbol: 'DIMO', balance: balanceDimo },
                            { symbol: 'DCX', balance: balanceDCX }
                        ]}
                        exchangeRate={exchangeRate}
                    />

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
                            <AppsList apps={hardcodedApps} />
                        </>
                    )}

                    {/* Scenario 4: Apps created, DCX balance > 0 */}
                    {hasDCXBalance && hasApps && (
                        <>
                            <AppsList apps={hardcodedApps} />
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default View;
