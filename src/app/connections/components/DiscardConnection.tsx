'use client';
import { type FC, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { OwnerAction } from '@/components/OwnerOnly';
import { deleteConnection, type Connection } from '@/actions/connections';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { invalidateMyConnectionsQuery } from '@/hooks/queries/useMyConnections';
import { findMintedConnection } from '@/services/connectionLookup';
import {
  DISCARD_FAILED,
  DISCARD_LOOKUP_FAILED,
  DISCARD_MINTED,
  DISCARD_NOT_PENDING,
  DISCARD_SUBTITLE,
  DISCARDED,
} from '../copy';

// Discarding deletes the only copy of the keys. The browser may have died after the
// mint landed and before the row was updated, so a PENDING row can still own its name
// on-chain: ask Identity and the chain first, and delete only when this wallet doesn't
// hold the name.
export const DiscardConnection: FC<{ connection: Connection }> = ({ connection }) => {
  const [open, setOpen] = useState(false);
  const { currentUser } = useGlobalAccount();
  if (connection.status !== 'PENDING') return null;

  const discard = async () => {
    const wallet = currentUser?.smartContractAddress?.toLowerCase();
    // Without the wallet nobody can say the name isn't this user's: fail closed.
    if (!wallet) {
      toast.error(DISCARD_LOOKUP_FAILED);
      setOpen(false);
      return;
    }
    try {
      const found = await findMintedConnection(connection.name);
      if (found && found.owner.toLowerCase() === wallet) {
        toast.error(DISCARD_MINTED);
        setOpen(false);
        return;
      }
    } catch (error) {
      console.error('Looking up the connection failed:', error);
      toast.error(DISCARD_LOOKUP_FAILED);
      setOpen(false);
      return;
    }

    const result = await deleteConnection(connection.id).catch(() => null);
    if (result?.ok) {
      toast.success(DISCARDED);
    } else if (result?.code === 'CONNECTION_NOT_PENDING') {
      toast.error(DISCARD_NOT_PENDING);
    } else if (result?.status !== 404) {
      toast.error(DISCARD_FAILED);
    }
    setOpen(false);
    await invalidateMyConnectionsQuery();
  };

  return (
    <OwnerAction>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        Discard
      </Button>
      <DeleteConfirmationModal
        isOpen={open}
        title={`Discard ${connection.name}?`}
        subtitle={DISCARD_SUBTITLE}
        onConfirm={discard}
        onCancel={() => setOpen(false)}
      />
    </OwnerAction>
  );
};
