'use client';
import { FC } from 'react';
import { useContractGA } from '@/hooks';
// import { getMyApps } from '@/services/app';  // Leave this commented for now
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import './View.css';

export const View: FC = () => {
    const { balanceDCX } = useContractGA();

    // Keep hardcoded apps for testing
    const hardcodedApps = [
        { id: '1', name: 'Test App 1', status: 'active' },
    ];
    const hasApps = hardcodedApps.length > 0;
    const hasDCXBalance = balanceDCX > 0;

    return (
        <div className="home-page">
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
        </div>
    );
};

export default View;
