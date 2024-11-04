'use client';
import { FC, useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
//import { useContractGA } from '@/hooks/useContractGA';  //santi merge PR
//import { getMyApps } from '@/services/app';  // Commenting out for now
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import './View.css';

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding();
    //const { balanceDimo, balanceDCX } = useContractGA();  // Get balances using the hook
    const balanceDCX = '10';

    // Commenting out the getMyApps-related code and hardcoding apps for testing
    // const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(false); // No need to simulate loading for now
    const hardcodedApps = [
        { id: '1', name: 'Test App 1', status: 'active' },
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

    return (
        <div className="home-page">
            {isLoading || loadingApps ? (
                <div>Loading...</div>
            ) : (
                <>

                    <div className="welcome-message">
                        <p className="title">Welcome to DIMO Developer Console</p>
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
                            <div className="apps-section">
                                <AppsList apps={hardcodedApps} />
                            </div>
                        </>
                    )}

                    {/* Scenario 4: Apps created, DCX balance > 0 */}
                    {hasDCXBalance && hasApps && (
                        <>
                            <div className="apps-section">
                                <AppsList apps={hardcodedApps} />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default View;
