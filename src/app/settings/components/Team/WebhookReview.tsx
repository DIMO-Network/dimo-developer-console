'use client';
import { type FC, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { NeedsDevJwtError, useMemberWebhooks } from '@/hooks/useMemberWebhooks';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { memberAddresses, memberLicenseKeys } from './memberKeys';
import { displayName } from './MembersTable';

const LicenseWebhooks: FC<{
  license: TeamLicense;
  addresses: string[];
  name: string;
}> = ({ license, addresses, name }) => {
  const [pasted, setPasted] = useState('');
  const [pastedJwt, setPastedJwt] = useState<string>();
  const [pasteError, setPasteError] = useState<string | null>(null);
  const query = useMemberWebhooks({
    clientId: license.clientId,
    redirectUri: license.redirectUri,
    addresses,
    pastedJwt,
  });

  const check = () => {
    let clientId: string | undefined;
    try {
      clientId = jwtDecode<{ ethereum_address?: string }>(pasted.trim()).ethereum_address;
    } catch {
      clientId = undefined;
    }
    if (clientId?.toLowerCase() !== license.clientId.toLowerCase()) {
      setPasteError('That developer JWT is for another license.');
      return;
    }
    setPasteError(null);
    setPastedJwt(pasted.trim());
  };

  if (query.isLoading)
    return <p className="text-body-sm text-muted">Checking {license.label}…</p>;
  if (query.error) {
    const id = `review-jwt-${license.tokenId}`;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-muted">
          {query.error instanceof NeedsDevJwtError
            ? `We need a developer JWT for ${license.label} to check its webhooks.`
            : `Couldn't load the webhooks for ${license.label}.`}
        </p>
        <label htmlFor={id} className="text-label text-muted">
          {`Paste a developer JWT for ${license.label}`}
        </label>
        <TextField id={id} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        {pasteError && (
          <p role="alert" className="text-body-sm text-negative">
            {pasteError}
          </p>
        )}
        <Button variant="secondary" onClick={check} disabled={!pasted.trim()}>
          Check webhooks
        </Button>
      </div>
    );
  }
  if (!query.data?.length) {
    return (
      <p className="text-body-sm text-muted">
        {`No webhooks on ${license.label} were created or changed by ${name}.`}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {query.data.map(({ webhook, created, updated }) => (
        <li
          key={webhook.id}
          className="flex flex-col gap-0.5 rounded-control bg-control p-3"
        >
          <span className="text-body-sm text-ink">
            {webhook.displayName || webhook.description || webhook.id}
          </span>
          <span className="break-all font-mono text-code text-muted">
            {webhook.targetURL}
          </span>
          <span className="text-label text-muted">
            {created && updated
              ? 'Created and last changed by them'
              : created
                ? 'Created by them'
                : 'Last changed by them'}
          </span>
        </li>
      ))}
    </ul>
  );
};

// Webhooks keep running after a member goes: list the ones they created or
// last changed, on every license they hold or held a key on (C3).
export const WebhookReview: FC<{ member: TeamMember; licenses: TeamLicense[] }> = ({
  member,
  licenses,
}) => {
  const tokenIds = new Set(memberLicenseKeys(member, licenses).map((k) => k.tokenId));
  const reviewed = licenses.filter((l) => tokenIds.has(l.tokenId));
  if (!reviewed.length) return null;
  const name = displayName(member);
  const addresses = memberAddresses(member);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body text-ink">Webhooks to review</h3>
      <p className="text-body-sm text-muted">
        Webhooks keep sending vehicle data after {name} goes. Check the ones they created
        or changed.
      </p>
      {reviewed.map((license) => (
        <LicenseWebhooks
          key={license.tokenId}
          license={license}
          addresses={addresses}
          name={name}
        />
      ))}
    </div>
  );
};
