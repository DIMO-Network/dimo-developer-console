'use client';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { TokenBalance } from '@/components/TokenBalance/TokenBalance';
import { getMyApps, getMyApp } from '@/services/app';
import './View.css';

export const View: FC = () => {
    const { isOnboardingCompleted, isLoading } = useOnboarding(); // Onboarding status
    const [dcxBalance, setDcxBalance] = useState<number>(0); // Placeholder for DCX balance
    const [apps, setApps] = useState<Array<{ id: string; name: string; status: string }>>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const exchangeRate = 0.001;
    const router = useRouter();

    // Placeholder function for fetching DCX balance
    const fetchDcxBalance = async () => {
        try {
            const fetchedBalance = 1000000; // Example hardcoded balance
            setDcxBalance(fetchedBalance);
        } catch (error) {
            console.error('Error fetching DCX balance:', error);
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
            const fetchApps = async () => {
                try {
                    const response = await getMyApps(); // Fetch the user's apps
                    setApps(response.results); // Use results from the API
                } catch (error) {
                    console.error('Error fetching apps:', error);
                } finally {
                    setLoadingApps(false);
                }
            };

            fetchApps();
            fetchDcxBalance();
        }
    }, [isOnboardingCompleted]);

    // Helper variables for conditional rendering
    const hasDCXBalance = dcxBalance > 0;
    const hasApps = apps.length > 0;

    return (
        <div className="home-page">
            {/* Loading State */}
            {isLoading || loadingApps ? (
                <div>Loading...</div>
            ) : (
                <>
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
