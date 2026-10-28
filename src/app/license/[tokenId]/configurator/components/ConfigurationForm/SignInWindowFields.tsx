import { FC } from 'react';
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

const LANGUAGE_OPTIONS: { value: LoginLanguage; label: string }[] = [
  { value: '', label: "Match the user's browser" },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const EMAIL_OPTIONS: { value: EmailRequest; label: string }[] = [
  { value: 'none', label: "Don't ask" },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
];

const EMAIL_HINTS: Record<EmailRequest, string> = {
  none: "Users aren't asked, and your app doesn't get their email.",
  optional: 'After signing in, users choose whether to share their email with your app.',
  required: 'After signing in, users must share their email with your app to continue.',
};

/** What the DIMO sign-in window shows, whichever component opens it. */
export const SignInWindowFields: FC<IFormProps> = ({ control }) => {
  const emailRequest = useWatch({ control, name: 'emailRequest' }) ?? 'optional';

  return (
    <div className="rounded-card bg-card p-4 flex flex-col gap-4">
      <h3 className="text-card-title text-ink">Sign-in window</h3>
      <div className="flex flex-col gap-2">
        <p className="text-label text-muted">Language</p>
        <SegmentedControl
          name="language"
          control={control}
          options={LANGUAGE_OPTIONS}
          role="language-segmented"
        />
        <p className="text-label font-normal text-muted">
          When matching, Japanese browsers and the Japan time zone get Japanese and
          everyone else gets English. Users can always switch.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-label text-muted">Email address</p>
        <SegmentedControl
          name="emailRequest"
          control={control}
          options={EMAIL_OPTIONS}
          role="email-request-segmented"
        />
        <p className="text-label font-normal text-muted">{EMAIL_HINTS[emailRequest]}</p>
      </div>
    </div>
  );
};
