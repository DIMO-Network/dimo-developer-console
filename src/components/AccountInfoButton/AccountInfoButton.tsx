import { isOwner } from '@/utils/user';
import { UserAvatar } from '@/components/UserAvatar';
import { useGlobalAccount, useUser } from '@/hooks';
import { FC, useContext } from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { Button } from '@/components/Button';

interface IAccountInfoButtonProps {
  variant?: 'button' | 'avatar';
}

export const AccountInfoButton: FC<IAccountInfoButtonProps> = ({
  variant = 'avatar',
}) => {
  const { data: user } = useUser();
  const { currentUser } = useGlobalAccount();
  const { setShowAccountInformation } = useContext(AccountInformationContext);
  const handleOpenAccountInformationModal = () => {
    if (isOwner(currentUser?.role ?? '')) {
      setShowAccountInformation(true);
    }
  };

  if (variant === 'button') {
    return (
      <Button className={'primary-outline'} onClick={handleOpenAccountInformationModal}>
        Account Info
      </Button>
    );
  }

  return (
    <button title="Account Information" onClick={handleOpenAccountInformationModal}>
      <UserAvatar name={user?.name ?? ''} />
    </button>
  );
};
