import { useGlobalAccount } from './useGlobalAccount';

export const useIsLicenseOwner = (license: { owner: string }) => {
  const { currentUser } = useGlobalAccount();
  return (
    !!currentUser?.smartContractAddress &&
    currentUser.smartContractAddress === license.owner
  );
};
