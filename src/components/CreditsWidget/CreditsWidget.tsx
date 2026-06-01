/* eslint-disable @typescript-eslint/no-unused-vars */
import { FC, useContext, useEffect, useState } from 'react';
import { useGlobalAccount } from '@/hooks';
import { isCollaborator, isOwner } from '@/utils/user';
import { formatToCurrency } from '@/utils/formatBalance';
import * as Sentry from '@sentry/nextjs';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { Button } from '@/components/Button';
import { AccountInfoButton } from '@/components/AccountInfoButton';
import { CreditsContext } from '@/context/creditsContext';
import { cn } from '@/lib/utils';
import './CreditsWidget.css';

interface ICreditsWidgetProps {
  variant?: 'small' | 'large';
}

const DCX_IN_USD = 0.001;

export const CreditsWidget: FC<ICreditsWidgetProps> = ({ variant = 'small' }) => {
  const [dcxBalance, setDcxBalance] = useState<string>('$0.00');
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();
  const { setIsOpen: _setIsOpen } = useContext(CreditsContext);

  const loadAndFormatDcxBalance = async () => {
    try {
      if (isCollaborator(currentUser?.role ?? '')) return;
      const balance = await getCurrentDcxBalance();
      setDcxBalance(formatToCurrency(balance * DCX_IN_USD));
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error(error);
    }
  };

  // const handleBuyCredits = () => {
  //   if (isOwner(currentUser?.role ?? '')) {
  //     setIsOpen(true);
  //   }
  // };

  useEffect(() => {
    if (!currentUser) return;
    void loadAndFormatDcxBalance();
  }, [currentUser]);

  if (variant === 'large') {
    return (
      <div className="credits-large">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <WalletIcon className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <div className="flex flex-row gap-2.5 items-center">
                <p className="text-4xl font-medium text-foreground">{dcxBalance}</p>
              </div>
              <p className="text-muted-foreground text-xs">Current Balance</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col w-full gap-2">
            {/* <Button className="dark w-full" onClick={handleBuyCredits}>
              Buy Credits
            </Button> */}
            <AccountInfoButton variant="button" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="credits-display"
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10',
        'px-3 py-1 text-sm font-semibold text-muted-foreground',
      )}
    >
      <span className="text-primary text-xs">$</span>
      <span className="text-muted-foreground">{dcxBalance.replace('$', '')}</span>
      {/* {isOwner(currentUser?.role ?? '') && (
        <button
          type="button"
          title="Add Credits"
          aria-label="Add Credits"
          className="ml-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
          onClick={handleBuyCredits}
          role="add-credits"
        >
          <PlusIcon className="h-3 w-3 text-primary" />
        </button>
      )} */}
    </div>
  );
};
