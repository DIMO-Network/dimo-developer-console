'use client';
import React, { FC, useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/nextjs';
import { isAxiosError } from 'axios';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { NotificationContext } from '@/context/notificationContext';

import {
  createMyBrand,
  updateMyBrandById,
  setDefaultBrand,
  uploadMyBrandAsset,
} from '@/actions/brand';
import { ImagePicker } from './ImagePicker';
import type { BrandView } from '@/services/brand';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY_COLOR = '#000000';

interface FormInputs {
  name: string;
  primaryColor: string;
}

interface Props {
  /** null = creating a new brand */
  brand: BrandView | null;
  workspaceId: string;
  isOwner: boolean;
  onSave: (saved: BrandView) => void;
  onCancel: () => void;
  /** Called after set-default succeeds so the parent can reload the brand list. */
  onSetDefault: () => void;
}

export const BrandForm: FC<Props> = ({
  brand,
  workspaceId,
  isOwner,
  onSave,
  onCancel,
  onSetDefault,
}) => {
  const { setNotification } = useContext(NotificationContext);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoCid, setLogoCid] = useState<string | null>(brand?.logoCid ?? null);
  const [iconCid, setIconCid] = useState<string | null>(brand?.iconCid ?? null);
  const [saving, setSaving] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  const isExisting = !!brand;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormInputs>({
    mode: 'onChange',
    defaultValues: {
      name: brand?.name ?? '',
      primaryColor: brand?.primaryColor ?? '',
    },
  });

  const watchedColor = watch('primaryColor');
  const showRenameWarning = isExisting && !!dirtyFields.name;

  const onSubmit = async ({ name, primaryColor }: FormInputs) => {
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
      const patch = {
        name: name || null,
        logoCid: nextLogoCid,
        iconCid: nextIconCid,
        primaryColor:
          primaryColor && HEX_COLOR_RE.test(primaryColor) ? primaryColor : null,
      };
      const updated = isExisting
        ? await updateMyBrandById(workspaceId, brand.id, patch)
        : await createMyBrand(workspaceId, patch);

      onSave(updated);
      reset({ name: updated.name ?? '', primaryColor: updated.primaryColor ?? '' });
      setLogoCid(updated.logoCid);
      setIconCid(updated.iconCid);
      setLogoFile(null);
      setIconFile(null);
      setNotification('Brand saved', 'Saved', 'success');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        setNotification(
          'A brand with this name already exists',
          'Name conflict',
          'error',
        );
      } else {
        Sentry.captureException(error);
        setNotification('Failed to save brand', 'Oops…', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (!brand) return;
    setSettingDefault(true);
    try {
      await setDefaultBrand(workspaceId, brand.id);
      onSetDefault();
      setNotification('Default brand updated', 'Updated', 'success');
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Failed to set default brand', 'Oops…', 'error');
    } finally {
      setSettingDefault(false);
    }
  };

  const dirty = isDirty || !!logoFile || !!iconFile;

  return (
    <form className="flex flex-col gap-6 pt-4 pb-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="field">
        <Label htmlFor="brand-name" className="text-sm font-medium">
          Display name
          <TextField
            {...register('name', {
              required: 'Display name is required.',
              maxLength: { value: 100, message: 'Max 100 characters' },
            })}
            id="brand-name"
            placeholder="e.g. Fleet App"
            disabled={!isOwner || saving}
          />
          {showRenameWarning && (
            <p className="text-xs text-warning mt-1">
              Renaming breaks existing Login with DIMO calls using this name
            </p>
          )}
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
                validate: (v) => !v || HEX_COLOR_RE.test(v) || 'Must be #RRGGBB hex',
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
          <Button type="submit" className="light" disabled={!dirty} loading={saving}>
            Save Brand
          </Button>
          {isExisting && !brand.isDefault && (
            <Button
              type="button"
              className="light"
              onClick={handleSetDefault}
              loading={settingDefault}
            >
              Set as Default
            </Button>
          )}
          <Button
            type="button"
            className="light"
            onClick={onCancel}
            disabled={saving || settingDefault}
          >
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
};
