import { Label } from '@/components/Label';
import { get } from 'lodash';
import { useGlobalAccount } from '@/hooks';
import { CopyableRow } from '@/components/CopyableRow';

import '../../shared/AccountInformationModal.css';

export const AccountInformation = () => {
  const { currentUser } = useGlobalAccount();

  return (
    <div className={'flex flex-col gap-4 p-4 bg-surface-default rounded-2xl'}>
      <div className="account-information-row">
        <Label htmlFor="email" className="text-xs text-medium">
          Owner Email
        </Label>
        <p className={'text-text-secondary text-base'}>{currentUser?.email ?? ''}</p>
      </div>
      <div className="account-information-row">
        <Label htmlFor="email" className="text-xs text-medium">
          Organization Wallet Address
          <CopyableRow
            value={get(currentUser, 'smartContractAddress', '')}
            onCopySuccessMessage={'Wallet address copied to clipboard'}
          />
        </Label>
      </div>
    </div>
  );
};
