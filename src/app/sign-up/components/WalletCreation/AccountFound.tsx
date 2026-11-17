import { Anchor } from '@/components/Anchor';
import { BubbleLoader } from '@/components/BubbleLoader';
import { FC } from 'react';
import { useTranslations } from 'next-intl';

export const AccountFoundSignup: FC = () => {
  const t = useTranslations('sign-up');
  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className="text-title text-ink">{t('wallet.accountFound.title')}</p>
        </div>
        <div className="otp-login-text">
          <p>{t('wallet.accountFound.body')}</p>
        </div>
        <BubbleLoader isLoading={true} />
        <div className="sign-up__extra-links">
          <div className="flex flex-row">
            <p className="terms-caption">
              {t.rich('wallet.lostPasskey', {
                recover: (chunks) => (
                  <Anchor
                    href="/email-recovery"
                    target="_self"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
          <div className="flex flex-row">
            <p className="terms-caption">
              {t.rich('wallet.troubleLoggingIn', {
                support: (chunks) => (
                  <Anchor
                    href="mailto:developer-support@dimo.org"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
