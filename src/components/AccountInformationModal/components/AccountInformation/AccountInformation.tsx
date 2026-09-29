import { Label } from '@/components/Label';
import { get } from 'lodash';
import { useGlobalAccount } from '@/hooks';
import { CopyableRow } from '@/components/CopyableRow';

import '../../shared/AccountInformationModal.css';

export const AccountInformation = () => {
  const { currentUser } = useGlobalAccount();

  return (
    <div className={'flex flex-col gap-4 rounded-card bg-card p-4'}>
      <div className="account-information-row">
        <Label htmlFor="email">Owner email</Label>
        <p className={'text-body-sm text-fg'}>{currentUser?.email ?? ''}</p>
      </div>
      <div className="account-information-row">
        <Label htmlFor="email">
          Organization wallet address
          <div className="w-full min-w-0 [&_.copyable-row]:min-w-0 [&_.copyable-row_p]:min-w-0 [&_.copyable-row_p]:break-all">
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
