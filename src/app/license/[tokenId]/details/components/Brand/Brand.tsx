import React, { FC, useContext, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { NotificationContext } from '@/context/notificationContext';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { FragmentType, gql, useFragment } from '@/gql';

import { fetchMyBrand, saveMyBrand, uploadMyBrandAsset } from '@/actions/brand';
import { getWorkspace, getWorkspaceByTokenId } from '@/actions/workspace';
import { ImagePicker } from './components/ImagePicker';
import type { BrandView } from '@/services/brand';

/**
 * Captures everything the Brand panel needs about the developer license: the
 * owner address (for the owner-gate) and tokenId (to sanity-check the route
 * matches the user's workspace).
 */
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

interface FormInputs {
  name: string;
  primaryColor: string;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY_COLOR = '#000000';

export const Brand: FC<Props> = ({ license }) => {
  const fragment = useFragment(BRAND_FRAGMENT, license);
  const isOwner = useIsLicenseOwner(fragment);
  const { setNotification } = useContext(NotificationContext);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandView | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoCid, setLogoCid] = useState<string | null>(null);
  const [iconCid, setIconCid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormInputs>({
    mode: 'onChange',
    defaultValues: { name: '', primaryColor: '' },
  });
  const watchedColor = watch('primaryColor');

  // Mount-only ref so re-renders triggered by the error toast don't re-fire
  // the load effect (NotificationContext's setNotification reference is not
  // stable across renders, so adding it to deps causes an infinite loop).
  const setNotificationRef = useRef(setNotification);
  setNotificationRef.current = setNotification;
  const [loadError, setLoadError] = useState<string | null>(null);

  /** Initial load: workspace id + current brand. Runs exactly once.
   *
   * Strategy: prefer the tokenId-scoped lookup because the Brand panel is
   * always per-license — the URL pins the right workspace. The company-
   * scoped fallback exists for symmetry with the rest of the console but
   * misses on accounts where workspace.company_id is stale.
   */
  const licenseTokenId = fragment.tokenId;
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ws =
          (await getWorkspaceByTokenId(licenseTokenId)) ?? (await getWorkspace());
        if (cancelled) return;
        if (!ws?.id) {
          Sentry.captureMessage(
            '[Brand] no workspace resolved for license',
            { extra: { tokenId: licenseTokenId, workspace: ws } },
          );
          setLoadError(
            'Could not load your workspace. Re-login and try again.',
          );
          return;
        }
        setWorkspaceId(ws.id);

        const b = await fetchMyBrand(ws.id);
        if (cancelled) return;
        setBrand(b);
        setLogoCid(b?.logoCid ?? null);
        setIconCid(b?.iconCid ?? null);
        reset({
          name: b?.name ?? '',
          primaryColor: b?.primaryColor ?? '',
        });
      } catch (error) {
        Sentry.captureException(error);
        setLoadError(
          'Failed to load brand. Check your connection and reload.',
        );
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

  // Toast the load error exactly once, decoupled from the load effect so the
  // unstable setNotification reference can't retrigger the fetch.
  useEffect(() => {
    if (!loadError) return;
    setNotificationRef.current(loadError, 'Brand load error', 'error');
  }, [loadError]);

  const onSubmit = async ({ name, primaryColor }: FormInputs) => {
    if (!workspaceId) {
      // Defensive — the load() guard above should have already notified, but
      // never silently swallow a Save click.
      setNotification(
        'Workspace not loaded — re-login and try again.',
        'Cannot save',
        'error',
      );
      return;
    }
    setSaving(true);
    try {
      let nextLogoCid = logoCid;
      let nextIconCid = iconCid;
      if (logoFile) {
        const r = await uploadMyBrandAsset(workspaceId, logoFile);
        nextLogoCid = r.cid;
      }
      if (iconFile) {
        const r = await uploadMyBrandAsset(workspaceId, iconFile);
        nextIconCid = r.cid;
      }
      const updated = await saveMyBrand(workspaceId, {
        name: name || null,
        logoCid: nextLogoCid,
        iconCid: nextIconCid,
        primaryColor:
          primaryColor && HEX_COLOR_RE.test(primaryColor) ? primaryColor : null,
      });
      setBrand(updated);
      setLogoCid(updated.logoCid);
      setIconCid(updated.iconCid);
      setLogoFile(null);
      setIconFile(null);
      reset({
        name: updated.name ?? '',
        primaryColor: updated.primaryColor ?? '',
      });
      setNotification('Brand updated', 'Saved', 'success');
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Failed to update brand', 'Oops…', 'error');
    } finally {
      setSaving(false);
    }
  };

  const dirty = isDirty || !!logoFile || !!iconFile;

  return (
    <CollapsibleSection>
      <CollapsibleSection.Title title="Brand">
        {isOwner && (
          <span className="text-text-secondary text-xs">
            Visible on the Login-with-DIMO button when consumers initialise with your
            <code className="ml-1">clientId</code>.
          </span>
        )}
      </CollapsibleSection.Title>
      <CollapsibleSection.Content>
        {loading ? (
          <div className="text-text-secondary">Loading brand…</div>
        ) : (
          <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="field">
              <Label htmlFor="brand-name" className="text-sm font-medium">
                Display name
                <TextField
                  {...register('name', {
                    required:
                      'Display name is required — SDK + popup skip loading the brand when name is empty.',
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  })}
                  id="brand-name"
                  placeholder="e.g. Toyota"
                  disabled={!isOwner || saving}
                />
                <p className="text-text-secondary font-normal">
                  Used in the auth button label: <em>“Sign in with {'{name}'}”</em>.
                </p>
                {errors.name && <TextError errorMessage={errors.name.message!} />}
              </Label>
            </div>

            <ImagePicker
              label="Logo"
              hint="Wide brand mark used on the auth button. PNG, JPEG, WebP, or SVG."
              currentUrl={brand?.logoUrl ?? null}
              file={logoFile}
              onFile={setLogoFile}
              onClear={() => {
                setLogoFile(null);
                setLogoCid(null);
              }}
              aspect="wide"
              disabled={!isOwner || saving}
            />

            <ImagePicker
              label="Icon"
              hint="Square mark used in popup chrome + tab favicon. PNG, JPEG, WebP, or SVG."
              currentUrl={brand?.iconUrl ?? null}
              file={iconFile}
              onFile={setIconFile}
              onClear={() => {
                setIconFile(null);
                setIconCid(null);
              }}
              aspect="square"
              disabled={!isOwner || saving}
            />

            <div className="field">
              <Label className="text-sm font-medium">
                Primary color
                <p className="text-text-secondary font-normal">
                  Used as the auth button background + popup CTA. 7-char hex, e.g.{' '}
                  <code>#C8A84B</code>. Leave blank for DIMO defaults.
                </p>
                <div className="flex flex-row items-center gap-3 mt-2">
                  <input
                    type="color"
                    aria-label="Pick primary color"
                    value={
                      watchedColor && HEX_COLOR_RE.test(watchedColor)
                        ? watchedColor
                        : DEFAULT_PRIMARY_COLOR
                    }
                    onChange={(e) =>
                      setValue('primaryColor', e.target.value, { shouldDirty: true })
                    }
                    className="h-10 w-12 rounded border border-border bg-transparent p-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!isOwner || saving}
                  />
                  <TextField
                    {...register('primaryColor', {
                      validate: (v) =>
                        !v || HEX_COLOR_RE.test(v) || 'Must be #RRGGBB hex',
                    })}
                    placeholder="#C8A84B"
                    disabled={!isOwner || saving}
                    className="font-mono w-32"
                  />
                  {watchedColor && HEX_COLOR_RE.test(watchedColor) && (
                    <span
                      className="inline-block h-8 w-8 rounded border border-border"
                      style={{ backgroundColor: watchedColor }}
                      aria-hidden
                    />
                  )}
                </div>
                {errors.primaryColor && (
                  <TextError errorMessage={errors.primaryColor.message!} />
                )}
              </Label>
            </div>

            {isOwner && (
              <div className="flex flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  className="light"
                  disabled={!dirty}
                  loading={saving}
                >
                  Save Brand
                </Button>
              </div>
            )}
          </form>
        )}
      </CollapsibleSection.Content>
    </CollapsibleSection>
  );
};

export default Brand;
