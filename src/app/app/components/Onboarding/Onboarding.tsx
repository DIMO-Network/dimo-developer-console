import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { OnboardingCard } from '@/app/app/components/OnboardingCard';

export const Onboarding = () => {
  const router = useRouter();

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  return (
    <div className="onboarding-steps">
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
