'use client';
import { FC, useEffect, useState } from 'react';
import { useContractGA } from '@/hooks';
import { getApps } from '@/actions/app';
import OnboardingSection from './OnboardingSection';
import GetStartedSection from './GetStartedSection';
import AttentionBox from './AttentionBox';
import AppsList from './AppsList';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { CreditsContext } from '@/context/creditsContext';
import './View.css';

interface AppItem {
  id: string;
  name: string;
}

export const View: FC = () => {
  const { balanceDCX } = useContractGA();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const router = useRouter();
  const { setIsOpen } = useContext(CreditsContext);

  const hasApps = apps.length > 0;
  const hasDCXBalance = balanceDCX > 0;

  const handleActionButtonClick = () => {
    if (hasDCXBalance && !hasApps) {
      router.push('/app/create');
    } else {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await getApps();
        const mappedApps = response.data.map((app) => ({
          id: app.id ?? '',
          name: app.name,
        }));
        setApps(mappedApps);
      } catch (error) {
        console.error('Error fetching apps:', error);
      } finally {
        setLoadingApps(false);
      }
    };

    fetchApps();
  }, []);

  return (
    <div className="home-page">
      {loadingApps ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="welcome-message">
            <p className="title">Welcome to DIMO Developer Console</p>
          </div>

          <div className="image-container">
            <img
              src="/images/LogoDIMO.png"
              alt="DIMO Logo"
              className="header-image"
            />
            {(!hasDCXBalance || (!hasApps && hasDCXBalance)) && (
              <Button
                className="action-button"
                onClick={handleActionButtonClick}
              >
                {hasDCXBalance ? 'Create an App' : 'Purchase DCX'}
              </Button>
            )}
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
                <AppsList apps={apps} />
              </div>
            </>
          )}

          {/* Scenario 4: Apps created, DCX balance > 0 */}
          {hasDCXBalance && hasApps && (
            <div className="apps-section">
              <AppsList apps={apps} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default View;
