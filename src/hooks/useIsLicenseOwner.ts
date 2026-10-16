import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useTeam } from '@/hooks/useTeam';

// Owner actions need the license owner's wallet, and inside someone else's team
// the user acts as a member even on a license their own wallet owns.
export const useIsLicenseOwner = (license: { owner: string }) => {
  const { currentUser } = useGlobalAccount();
  const { activeTeam, isLoading } = useTeam();
  const own = currentUser?.smartContractAddress?.toLowerCase();
  const licenseOwner = license.owner.toLowerCase();
  if (!own || own !== licenseOwner) return false;
  if (isLoading || !activeTeam) return true;
  return (
    activeTeam.role === 'OWNER' && activeTeam.ownerAddress.toLowerCase() === licenseOwner
  );
};
