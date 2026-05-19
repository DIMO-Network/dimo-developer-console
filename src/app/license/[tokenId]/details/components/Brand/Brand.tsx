import React, { FC, useContext, useEffect, useState } from 'react';
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
import { getWorkspace } from '@/actions/workspace';
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
}

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
    formState: { errors, isDirty },
  } = useForm<FormInputs>({
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  /** Initial load: workspace id + current brand. */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ws = await getWorkspace();
        if (cancelled || !ws?.id) return;
        setWorkspaceId(ws.id);

        const b = await fetchMyBrand(ws.id);
        if (cancelled) return;
        setBrand(b);
        setLogoCid(b?.logoCid ?? null);
        setIconCid(b?.iconCid ?? null);
        reset({ name: b?.name ?? '' });
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = async ({ name }: FormInputs) => {
    if (!workspaceId) return;
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
      });
      setBrand(updated);
      setLogoCid(updated.logoCid);
      setIconCid(updated.iconCid);
      setLogoFile(null);
      setIconFile(null);
      reset({ name: updated.name ?? '' });
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
