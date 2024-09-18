import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { OnboardingCard } from '@/app/app/components/OnboardingCard';
import { useGlobalAccount } from '@/hooks';
import { shortenAddress } from '@/utils/user';
import { ContentCopyIcon } from '@/components/Icons';
import { useContext } from 'react';
import { NotificationContext } from '@/context/notificationContext';

export const Onboarding = () => {
  const router = useRouter();
  const { organizationInfo, currentChain } = useGlobalAccount();
  const { setNotification } = useContext(NotificationContext);

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setNotification('Wallet address copied to clipboard', 'Success', 'success', 1000);
  };

  return (
    <div className="onboarding-steps">
      <OnboardingCard
        title="Wallet"
        description="Below you'll find your spender wallet, use it and start building."
        action={
        <div className="w-full inline-flex gap-2">
          <p>{currentChain}</p>
          { organizationInfo &&
            <>
              <p>{organizationInfo && shortenAddress(organizationInfo.smartContractAddress!)}</p>
              <ContentCopyIcon
                className="w5 h-5 fill-white/50 cursor-pointer"
                onClick={() => handleCopy(organizationInfo.smartContractAddress!)}
              />
            </>
          }
        </div>
      }
      />
      <OnboardingCard
        title="Create your first application"
        description="Click the button to receive your credentials and access DIMO data in minutes."
        action={
          <Button
            className="primary w-full flex flex-row gap-2 items-center"
            onClick={handleCreateApp}
          >
            <span>Create app</span>
            <PlusIcon className="w-4 h-4" />
          </Button>
        }
      />
    </div>
  );
};

export default Onboarding;
