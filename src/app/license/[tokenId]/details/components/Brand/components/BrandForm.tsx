'use client';
import React, { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { toast } from 'sonner';

import {
  createMyBrand,
  updateMyBrandById,
  setDefaultBrand,
  uploadMyBrandAsset,
} from '@/actions/brand';
import { ImagePicker } from './ImagePicker';
import type { BrandView } from '@/services/brand';
import type { ApiResult } from '@/types/team';
import { contrastRatio, HEX_COLOR_RE } from '@/utils/colorContrast';

const DEFAULT_PRIMARY_COLOR = '#000000'; // token-check:allow (color-input value)
const EXAMPLE_PRIMARY_COLOR = '#C8A84B'; // token-check:allow (example brand color)

// The sign-in window's background in each mode (dimo-login's --sheet).
const SIGN_IN_BACKGROUNDS = [
  { mode: 'light', color: '#FFFFFF' }, // token-check:allow (dimo-login color)
  { mode: 'dark', color: '#16181B' }, // token-check:allow (dimo-login color)
];
// WCAG's minimum contrast for buttons against what surrounds them.
const MIN_BUTTON_CONTRAST = 3;

/** The modes where buttons in this color would be hard to make out. */
const lowContrastModes = (color: string) =>
  SIGN_IN_BACKGROUNDS.filter(
    ({ color: background }) => contrastRatio(color, background) < MIN_BUTTON_CONTRAST,
  ).map(({ mode }) => mode);

interface FormInputs {
  name: string;
  primaryColor: string;
}

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

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
  const t = useTranslations('license');
  const tCommon = useTranslations('common');
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
    setError,
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
  const hardToSeeIn =
    watchedColor && HEX_COLOR_RE.test(watchedColor) ? lowContrastModes(watchedColor) : [];
  const showRenameWarning = isExisting && !!dirtyFields.name;

  const saveFailed = (failure: Failure) => {
    Sentry.captureException(
      new Error(`Saving a brand failed (${failure.status}): ${failure.message}`),
    );
    toast.error(t('brandForm.saveFailed'));
  };

  const imageRefused = (failure: Failure) => {
    if (failure.status !== 400) return saveFailed(failure);
    toast.error(t('brandForm.imageRefused'));
  };

  const brandRefused = (failure: Failure) => {
    if (failure.code !== 'BRAND_NAME_TAKEN') return saveFailed(failure);
    setError('name', { message: t('brandForm.nameTaken') });
  };

  const onSubmit = async ({ name, primaryColor }: FormInputs) => {
    setSaving(true);
    try {
      let nextLogoCid = logoCid;
      let nextIconCid = iconCid;
      if (logoFile) {
        const upload = await uploadMyBrandAsset(workspaceId, logoFile);
        if (!upload.ok) return imageRefused(upload);
        nextLogoCid = upload.data.cid;
      }
      if (iconFile) {
        const upload = await uploadMyBrandAsset(workspaceId, iconFile);
        if (!upload.ok) return imageRefused(upload);
        nextIconCid = upload.data.cid;
      }
      const patch = {
        name: name || null,
        logoCid: nextLogoCid,
        iconCid: nextIconCid,
        primaryColor:
          primaryColor && HEX_COLOR_RE.test(primaryColor) ? primaryColor : null,
      };
      const saved = isExisting
        ? await updateMyBrandById(workspaceId, brand.id, patch)
        : await createMyBrand(workspaceId, patch);
      if (!saved.ok) return brandRefused(saved);

      const updated = saved.data;
      onSave(updated);
      reset({ name: updated.name ?? '', primaryColor: updated.primaryColor ?? '' });
      setLogoCid(updated.logoCid);
      setIconCid(updated.iconCid);
      setLogoFile(null);
      setIconFile(null);
      toast.success(t('brandForm.saved'));
    } catch (error) {
      // The action itself failed: the network, a deploy, or a body over the limit.
      Sentry.captureException(error);
      toast.error(t('brandForm.saveFailed'));
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
      toast.success(t('brandForm.defaultUpdated'));
    } catch (error) {
      Sentry.captureException(error);
      toast.error(t('brandForm.defaultFailed'));
    } finally {
      setSettingDefault(false);
    }
  };

  const imageRemoved =
    logoCid !== (brand?.logoCid ?? null) || iconCid !== (brand?.iconCid ?? null);
  const dirty = isDirty || !!logoFile || !!iconFile || imageRemoved;

  return (
    <form className="flex flex-col gap-6 pt-4 pb-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="field">
        <Label htmlFor="brand-name">
          {t('brandForm.displayName')}
          <TextField
            {...register('name', {
              required: t('brandForm.displayNameRequired'),
              maxLength: { value: 100, message: t('brandForm.displayNameMax') },
            })}
            id="brand-name"
            placeholder={t('brandForm.displayNamePlaceholder')}
            disabled={!isOwner || saving}
          />
          {showRenameWarning && (
            <p className="mt-1 text-label text-warning">{t('brandForm.renameWarning')}</p>
          )}
          {errors.name && <TextError errorMessage={errors.name.message!} />}
        </Label>
      </div>

      <ImagePicker
        label={t('brandForm.logo')}
        hint={t('brandForm.logoHint')}
        currentUrl={logoCid ? (brand?.logoUrl ?? null) : null}
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
        label={t('brandForm.icon')}
        hint={t('brandForm.iconHint')}
        currentUrl={iconCid ? (brand?.iconUrl ?? null) : null}
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
        <Label>
          {t('brandForm.primaryColor')}
          <p className="font-normal text-muted">
            {t.rich('brandForm.primaryColorHint', {
              example: EXAMPLE_PRIMARY_COLOR,
              code: (chunks) => <code className="font-mono text-code">{chunks}</code>,
            })}
          </p>
          <div className="flex flex-row items-center gap-3 mt-2">
            <input
              type="color"
              aria-label={t('brandForm.pickColor')}
              value={
                watchedColor && HEX_COLOR_RE.test(watchedColor)
                  ? watchedColor
                  : DEFAULT_PRIMARY_COLOR
              }
              onChange={(e) =>
                setValue('primaryColor', e.target.value, { shouldDirty: true })
              }
              className="h-10 w-12 cursor-pointer rounded-chip border border-control-border bg-transparent p-0 disabled:cursor-not-allowed"
              disabled={!isOwner || saving}
            />
            <TextField
              {...register('primaryColor', {
                validate: (v) =>
                  !v || HEX_COLOR_RE.test(v) || t('brandForm.colorInvalid'),
              })}
              placeholder={EXAMPLE_PRIMARY_COLOR}
              disabled={!isOwner || saving}
              className="font-mono w-32"
            />
            {watchedColor && HEX_COLOR_RE.test(watchedColor) && (
              <span
                className="inline-block h-8 w-8 rounded-chip border border-outline"
                style={{ backgroundColor: watchedColor }}
                aria-hidden
              />
            )}
          </div>
          {errors.primaryColor && (
            <TextError errorMessage={errors.primaryColor.message!} />
          )}
          {hardToSeeIn.length > 0 && (
            <p className="text-label font-normal text-warning" role="status">
              {t('brandForm.lowContrast', {
                modes: hardToSeeIn.length > 1 ? 'both' : hardToSeeIn[0],
              })}
            </p>
          )}
        </Label>
      </div>

      {isOwner && (
        <div className="flex flex-row gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={!dirty} loading={saving}>
            {t('brandForm.save')}
          </Button>
          {isExisting && !brand.isDefault && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSetDefault}
              loading={settingDefault}
            >
              {t('brandForm.setDefault')}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={saving || settingDefault}
          >
            {tCommon('actions.cancel')}
          </Button>
        </div>
      )}
    </form>
  );
};
