/* eslint-disable @typescript-eslint/no-unused-vars */
import { FC, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalAccount } from '@/hooks';
import { useTeam } from '@/hooks/useTeam';
import { formatToCurrency } from '@/utils/formatBalance';
import * as Sentry from '@sentry/nextjs';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { Button } from '@/components/Button';
import { AccountInfoButton } from '@/components/AccountInfoButton';
import { CreditsContext } from '@/context/creditsContext';
import './CreditsWidget.css';

interface ICreditsWidgetProps {
  variant?: 'small' | 'large';
}

const DCX_IN_USD = 0.001;

export const CreditsWidget: FC<ICreditsWidgetProps> = ({ variant = 'small' }) => {
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();
  const { isMember } = useTeam();
  const { setIsOpen: _setIsOpen } = useContext(CreditsContext);

  // Cached by account so the header keeps showing the balance when a section
  // change remounts it, instead of flashing $0.00 while it reads the chain again.
  const { data: balance } = useQuery({
    queryKey: ['dcx-balance', currentUser?.smartContractAddress],
    queryFn: async () => {
      try {
        return await getCurrentDcxBalance();
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error(error);
        throw error;
      }
    },
    enabled: Boolean(currentUser) && !isMember,
    staleTime: 30_000,
  });
  const dcxBalance = formatToCurrency((balance ?? 0) * DCX_IN_USD);

  if (variant === 'large') {
    return (
      <div className="credits-large">
        <div className="flex flex-col gap-10">
          {!isMember && (
            <div className="flex flex-col gap-4">
              <WalletIcon className="w-4 h-4 text-muted" />
              <div className="flex flex-col">
                <div className="flex flex-row gap-2.5 items-center">
                  <p className="text-metric text-ink">{dcxBalance}</p>
                </div>
                <p className="text-label text-muted">Current Balance</p>
              </div>
            </div>
          )}
          <div className="flex flex-1 flex-col w-full gap-2">
            {/* <Button variant="secondary" className="w-full" onClick={handleBuyCredits}>
              Buy Credits
            </Button> */}
            <AccountInfoButton variant="button" />
          </div>
        </div>
      </div>
    );
  }

  if (isMember) return null;

  return (
    <div
      role="credits-display"
      className="flex items-center gap-1.5 rounded-full bg-control px-3 py-1"
    >
      <span className="text-label text-muted">$</span>
      <span className="text-card-title text-ink">{dcxBalance.replace('$', '')}</span>
    </div>
  );
};
