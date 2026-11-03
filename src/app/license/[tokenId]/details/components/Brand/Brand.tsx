'use client';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { toast } from 'sonner';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { FragmentType, gql, useFragment } from '@/gql';

import { deleteMyBrand } from '@/actions/brand';
import { getOrCreateLicenseWorkspace } from '@/actions/workspace';
import { BrandRow } from './components/BrandRow';
import { BrandForm } from './components/BrandForm';
import { useLicenseBrands, licenseBrandsKey } from '@/hooks/useLicenseBrands';
import type { BrandView, LicenseBrands } from '@/services/brand';

const BRAND_FRAGMENT = gql(`
  fragment BrandFragment on DeveloperLicense {
    alias
    owner
    tokenId
    clientId
  }
`);

const BRAND_DELETE =
  "Sites that ask for this brand by name get DIMO's own look instead. Pages already open can take a few minutes to change.";
const LAST_BRAND_DELETE =
  "Login with DIMO goes back to DIMO's own look for this license. Pages already open can take a few minutes to change.";

interface Props {
  license: FragmentType<typeof BRAND_FRAGMENT>;
}

export const Brand: FC<Props> = ({ license }) => {
  const fragment = useFragment(BRAND_FRAGMENT, license);
  const isOwner = useIsLicenseOwner(fragment);
  const { currentUser } = useGlobalAccount();
  const queryClient = useQueryClient();
  const licenseTokenId = fragment.tokenId;
  const query = useLicenseBrands(licenseTokenId);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /** null = list view; 'new' = create form; BrandView = edit form */
  const [editing, setEditing] = useState<BrandView | 'new' | null>(null);
  const [deleting, setDeleting] = useState<BrandView | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const createStarted = useRef(false);

  const workspaceId = query.data?.workspace?.id ?? null;
  const brands = query.data?.brands ?? [];
  const loadError = query.isError
    ? 'Failed to load brands. Check your connection and reload.'
    : createError;
  const loading = query.isLoading || creating;

  // Only the owner can create the workspace; for anyone else a license with
  // none is unbranded, not a failure. Creation is a write: a server action, so
  // it waits for a signed-in user: a tab without a session never resolves one,
  // and the action's 401 would be reported as `POST /sign-in`.
  const noWorkspace = query.isSuccess && !query.data.workspace?.id;
  useEffect(() => {
    if (!noWorkspace || !isOwner || !currentUser || createStarted.current) return;
    createStarted.current = true;
    setCreating(true);
    const create = async () => {
      try {
        const ws = await getOrCreateLicenseWorkspace({
          name: fragment.alias ?? `License #${licenseTokenId}`,
          token_id: licenseTokenId,
          client_id: fragment.clientId,
          owner: fragment.owner,
        });
        if (!ws?.id) {
          Sentry.captureMessage('[Brand] no workspace resolved for license', {
            extra: { license: licenseTokenId, workspace: ws },
          });
          setCreateError('Could not load your workspace. Re-login and try again.');
          return;
        }
        // An earlier refetch landing after this write would restore workspace: null.
        await queryClient.cancelQueries({ queryKey: licenseBrandsKey(licenseTokenId) });
        queryClient.setQueryData<LicenseBrands>(licenseBrandsKey(licenseTokenId), {
          workspace: ws,
          brands: [],
        });
      } catch (error) {
        Sentry.captureException(error);
        setCreateError('Failed to load brands. Check your connection and reload.');
      } finally {
        setCreating(false);
      }
    };
    void create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noWorkspace, isOwner, !!currentUser, licenseTokenId]);

  useEffect(() => {
    if (query.isError) Sentry.captureException(query.error);
  }, [query.isError, query.error]);

  useEffect(() => {
    if (!loadError) return;
    toast.error(loadError);
  }, [loadError]);

  const setBrands = async (update: (prev: BrandView[]) => BrandView[]) => {
    await queryClient.cancelQueries({ queryKey: licenseBrandsKey(licenseTokenId) });
    queryClient.setQueryData<LicenseBrands>(licenseBrandsKey(licenseTokenId), (prev) =>
      prev ? { ...prev, brands: update(prev.brands) } : prev,
    );
  };

  const handleSave = async (saved: BrandView) => {
    await setBrands((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setEditing(null);
  };

  const closeDelete = () => {
    setDeleting(null);
    setDeleteError(null);
  };

  const handleDelete = async (brandId: string) => {
    if (!workspaceId) return;
    setDeleteError(null);
    try {
      await deleteMyBrand(workspaceId, brandId);
      await setBrands((prev) => prev.filter((b) => b.id !== brandId));
      closeDelete();
    } catch (error) {
      Sentry.captureException(error);
      setDeleteError('Failed to delete brand. Try again.');
    }
  };

  const handleSetDefault = async () => {
    if (!workspaceId) return;
    try {
      await query.refetch();
    } catch (error) {
      Sentry.captureException(error);
    }
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 text-fg">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center md:gap-0">
        <h2 className="text-card-title text-ink">Brand</h2>
        {isOwner && workspaceId && !loadError && !editing && (
          <Button type="button" variant="secondary" onClick={() => setEditing('new')}>
            Add brand
          </Button>
        )}
      </div>
      <div>
        {loading ? (
          <div className="text-muted">Loading brands…</div>
        ) : editing ? (
          <BrandForm
            brand={editing === 'new' ? null : editing}
            workspaceId={workspaceId!}
            isOwner={isOwner}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            onSetDefault={handleSetDefault}
          />
        ) : loadError ? (
          <p role="alert" className="text-body-sm text-negative">
            {loadError}
          </p>
        ) : (
          <div className="flex flex-col">
            {brands.length === 0 ? (
              <p className="text-body-sm text-muted">No brand set.</p>
            ) : (
              brands.map((brand) => (
                <BrandRow
                  key={brand.id}
                  brand={brand}
                  isMultiple={brands.length > 1}
                  isOwner={isOwner}
                  onEdit={() => setEditing(brand)}
                  onDelete={() => setDeleting(brand)}
                />
              ))
            )}
            {brands.length > 0 && (
              <div className="mt-6 rounded-control bg-control p-4">
                <p className="mb-2 text-body-sm font-medium text-ink">
                  Using multiple brands with Login with DIMO
                </p>
                <pre className="overflow-x-auto font-mono text-code text-muted">{`<LoginWithDimo\n  mode={DimoSDKModes.POPUP}\n  brandOverride={{ name: 'Fleet App' }}\n  onSuccess={…}\n  onError={…}\n/>`}</pre>
                <p className="mt-1 text-label text-muted">
                  Every Login with DIMO button takes <code>brandOverride</code>. Omit it
                  to use your default brand.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <DeleteConfirmationModal
        isOpen={!!deleting}
        title={`Delete ${deleting?.name ?? ''}?`}
        subtitle={brands.length === 1 ? LAST_BRAND_DELETE : BRAND_DELETE}
        loadingLabel="Deleting brand…"
        error={deleteError}
        onConfirm={() => handleDelete(deleting!.id)}
        onCancel={closeDelete}
      />
    </div>
  );
};

export default Brand;
