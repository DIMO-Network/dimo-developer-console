import { FC, useContext, useEffect, useState } from 'react';
import { useGlobalAccount } from '@/hooks';
import { CreditsContext } from '@/context/creditsContext';
import { isCollaborator, isOwner } from '@/utils/user';
import { formatToHumanReadable } from '@/utils/formatBalance';
import * as Sentry from '@sentry/nextjs';
import { PlusIcon, WalletIcon } from '@/components/Icons';

import './CreditsWidget.css';
import { Button } from '@/components/Button';
import { AccountInfoButton } from '@/components/AccountInfoButton';

interface ICreditsWidgetProps {
  variant?: 'small' | 'large';
}

export const CreditsWidget: FC<ICreditsWidgetProps> = ({ variant = 'small' }) => {
  const [dcxBalance, setDcxBalance] = useState<string>('0');
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();
  const { setIsOpen } = useContext(CreditsContext);

  const loadAndFormatDcxBalance = async () => {
    try {
      if (isCollaborator(currentUser?.role ?? '')) return;
      const balance = await getCurrentDcxBalance();
      setDcxBalance(formatToHumanReadable(balance));
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error(error);
    }
  };
  useEffect(() => {
    if (!currentUser) return;
    void loadAndFormatDcxBalance();
  }, [currentUser]);

  const handleBuyCredits = () => {
    if (isOwner(currentUser?.role ?? '')) {
      setIsOpen(true);
    }
  };

  if (variant === 'large') {
    return (
      <div className={'credits-large'}>
        <div className={'flex flex-col gap-10'}>
          <div className={'flex flex-col gap-4'}>
            <WalletIcon className="w-4 h-4" />
            <div className={'flex flex-col'}>
              <div className={'flex flex-row gap-2.5 items-center'}>
                <p className="text-4xl font-medium">{dcxBalance}</p>
                <p className="text-xl font-medium text-text-secondary">DCX</p>
              </div>
              <p className={'text-text-secondary text-xs font-normal'}>Current Balance</p>
            </div>
          </div>
          <div className={'flex flex-1 flex-col w-full gap-2'}>
            <Button className={'dark w-full'} onClick={handleBuyCredits}>
              Buy DCX
            </Button>
            <AccountInfoButton variant={'button'} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="credits" role="credits-display">
      <div className="credits-info">
        <div className={'flex flex-row items-center gap-1'}>
          <WalletIcon className="w-4 h-4" />
          <p className="credit-amount">{dcxBalance}</p>
          <p className="credit-text">DCX</p>
        </div>
        <button
          title="Add Credits"
          className="btn-add-credits"
          disabled={!isOwner(currentUser?.role ?? '')}
          onClick={handleBuyCredits}
          role="add-credits"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
