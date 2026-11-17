import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { Control, useWatch } from 'react-hook-form';
import { SegmentedControl } from '@/components/SegmentedControl';
import {
  DynamicFormProps,
  EmailRequest,
  LoginLanguage,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

interface IFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
}

// Native names, so each stays in its own language whatever the console shows.
const LANGUAGE_OPTIONS: { value: LoginLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
  { value: 'zh-Hans', label: '简体中文' },
  { value: 'zh-Hant', label: '繁體中文' },
];

const EMAIL_REQUEST_VALUES: EmailRequest[] = ['none', 'optional', 'required'];

/** What the DIMO sign-in window shows, whichever component opens it. */
export const SignInWindowFields: FC<IFormProps> = ({ control }) => {
  const t = useTranslations('configurator');
  const emailRequest = useWatch({ control, name: 'emailRequest' }) ?? 'optional';

  return (
    <div className="rounded-card bg-card p-4 flex flex-col gap-4">
      <h3 className="text-card-title text-ink">{t('form.signIn.title')}</h3>
      <div className="flex flex-col gap-2">
        <p className="text-label text-muted">{t('form.signIn.language')}</p>
        <SegmentedControl
          name="language"
          control={control}
          options={[
            { value: '', label: t('form.signIn.matchBrowser') },
            ...LANGUAGE_OPTIONS,
          ]}
          role="language-segmented"
        />
        <p className="text-label font-normal text-muted">
          {t('form.signIn.languageHint')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-label text-muted">{t('form.signIn.email')}</p>
        <SegmentedControl
          name="emailRequest"
          control={control}
          options={EMAIL_REQUEST_VALUES.map((value) => ({
            value,
            label: t(`form.signIn.emailOptions.${value}`),
          }))}
          role="email-request-segmented"
        />
        <p className="text-label font-normal text-muted">
          {t(`form.signIn.emailHints.${emailRequest}`)}
        </p>
      </div>
    </div>
  );
};
