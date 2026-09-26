import { Label } from '@/components/Label';
import { get } from 'lodash';
import { useGlobalAccount } from '@/hooks';
import { CopyableRow } from '@/components/CopyableRow';

import '../../shared/AccountInformationModal.css';

export const AccountInformation = () => {
  const { currentUser } = useGlobalAccount();

  return (
    <div className={'flex flex-col gap-4 p-4 bg-card rounded-card'}>
      <div className="account-information-row">
        <Label htmlFor="email">Owner email</Label>
        <p className={'text-body-sm text-fg'}>{currentUser?.email ?? ''}</p>
      </div>
      <div className="account-information-row">
        <Label htmlFor="email">
          Organization wallet address
          <div className="max-w-full overflow-x-auto">
            <CopyableRow
              value={get(currentUser, 'smartContractAddress', '')}
              onCopySuccessMessage={'Wallet address copied to clipboard'}
            />
          </div>
        </Label>
      </div>
    </div>
  );
};
