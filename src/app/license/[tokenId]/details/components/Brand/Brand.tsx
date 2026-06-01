'use client';
import React, { FC, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { FragmentType, gql, useFragment } from '@/gql';

import { fetchMyBrands, deleteMyBrand } from '@/actions/brand';
import { getWorkspace, getWorkspaceByTokenId } from '@/actions/workspace';
import { BrandRow } from './components/BrandRow';
import { BrandForm } from './components/BrandForm';
import type { BrandView } from '@/services/brand';

const BRAND_FRAGMENT = gql(`
  fragment BrandFragment on DeveloperLicense {
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
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [brands, setBrands] = useState<BrandView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** null = list view; 'new' = create form; BrandView = edit form */
  const [editing, setEditing] = useState<BrandView | 'new' | null>(null);

  const licenseTokenId = fragment.tokenId;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ws =
          (await getWorkspaceByTokenId(licenseTokenId)) ?? (await getWorkspace());
        if (cancelled) return;
        if (!ws?.id) {
          Sentry.captureMessage('[Brand] no workspace resolved for license', {
            extra: { tokenId: licenseTokenId, workspace: ws },
          });
          setLoadError('Could not load your workspace. Re-login and try again.');
          return;
        }
        setWorkspaceId(ws.id);
        const list = await fetchMyBrands(ws.id);
        if (cancelled) return;
        setBrands(list);
      } catch (error) {
        Sentry.captureException(error);
        setLoadError('Failed to load brands. Check your connection and reload.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseTokenId]);

  useEffect(() => {
    if (!loadError) return;
    toast.error(loadError);
  }, [loadError]);

  const handleSave = (saved: BrandView) => {
    setBrands((prev) => {
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
      setBrands((prev) => prev.filter((b) => b.id !== brandId));
    } catch (error) {
      Sentry.captureException(error);
      toast.error('Failed to delete brand. Try again.');
    }
  };

  const handleSetDefault = async () => {
    if (!workspaceId) return;
    try {
      const list = await fetchMyBrands(workspaceId);
      setBrands(list);
    } catch (error) {
      Sentry.captureException(error);
    }
    setEditing(null);
  };

  return (
    <div className="p-4 bg-accent border border-border rounded-2xl flex flex-col gap-4 text-foreground">
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center">
        <h2 className="text-xl font-semibold text-foreground">Brand</h2>
        {isOwner && !editing && (
          <Button type="button" className="dark" onClick={() => setEditing('new')}>
            Add Brand
          </Button>
        )}
      </div>
      <div>
        {loading ? (
          <div className="text-text-secondary">Loading brands…</div>
        ) : editing ? (
          <BrandForm
            brand={editing === 'new' ? null : editing}
            workspaceId={workspaceId!}
            isOwner={isOwner}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            onSetDefault={handleSetDefault}
          />
        ) : (
          <div className="flex flex-col">
            {brands.length === 0 ? (
              <p className="text-text-secondary text-sm">No brand set.</p>
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
              <div className="mt-6 p-4 bg-accent rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">
                  Using multiple brands with Login with DIMO
                </p>
                <pre className="text-xs font-mono text-text-secondary overflow-x-auto">{`dimo.login({ clientId: '${fragment.clientId}', brandName: 'Fleet App' })`}</pre>
                <p className="text-xs text-text-secondary mt-1">
                  Omit <code>brandName</code> to use your default brand.
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
