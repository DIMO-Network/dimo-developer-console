'use client';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
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

interface Props {
  license: FragmentType<typeof BRAND_FRAGMENT>;
}

export const Brand: FC<Props> = ({ license }) => {
  const fragment = useFragment(BRAND_FRAGMENT, license);
  const isOwner = useIsLicenseOwner(fragment);
  const queryClient = useQueryClient();
  const licenseTokenId = fragment.tokenId;
  const query = useLicenseBrands(licenseTokenId);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /** null = list view; 'new' = create form; BrandView = edit form */
  const [editing, setEditing] = useState<BrandView | 'new' | null>(null);
  const createStarted = useRef(false);

  const workspaceId = query.data?.workspace?.id ?? null;
  const brands = query.data?.brands ?? [];
  const loadError = query.isError
    ? 'Failed to load brands. Check your connection and reload.'
    : createError;
  const loading = query.isLoading || creating;

  // Only the owner can create the workspace; for anyone else a license with
  // none is unbranded, not a failure. Creation is a write: a server action.
  const noWorkspace = query.isSuccess && !query.data.workspace?.id;
  useEffect(() => {
    if (!noWorkspace || !isOwner || createStarted.current) return;
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
  }, [noWorkspace, isOwner, licenseTokenId]);

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

  const handleDelete = async (brandId: string) => {
    if (!workspaceId) return;
    try {
      await deleteMyBrand(workspaceId, brandId);
      await setBrands((prev) => prev.filter((b) => b.id !== brandId));
    } catch (error) {
      Sentry.captureException(error);
      toast.error('Failed to delete brand. Try again.');
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
                  onDelete={() => void handleDelete(brand.id)}
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
    </div>
  );
};

export default Brand;
