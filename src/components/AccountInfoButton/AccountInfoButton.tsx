import { useTranslations } from 'next-intl';
import { UserAvatar } from '@/components/UserAvatar';
import { useUser } from '@/hooks/useUser';
import { FC, useContext } from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { Button } from '@/components/Button';

interface IAccountInfoButtonProps {
  variant?: 'button' | 'avatar';
}

export const AccountInfoButton: FC<IAccountInfoButtonProps> = ({
  variant = 'avatar',
}) => {
  const t = useTranslations('common');
  const { data: user } = useUser();
  const { setShowAccountInformation } = useContext(AccountInformationContext);
  const handleOpenAccountInformationModal = () => setShowAccountInformation(true);

  if (variant === 'button') {
    return (
      <Button variant="secondary" onClick={handleOpenAccountInformationModal}>
        {t('accountInfo.button')}
      </Button>
    );
  }

  return (
    <button title={t('accountInfo.title')} onClick={handleOpenAccountInformationModal}>
      <UserAvatar name={user?.name ?? ''} />
    </button>
  );
};
