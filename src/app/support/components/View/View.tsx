'use client';
import { FC } from 'react';
import { useTranslations } from 'next-intl';

import { ContactCard } from '@/app/support/components/ContactCard';
import { LightBulb, MenuBook, WarningAmberIcon } from '@/components/Icons';

import './View.css';
import { Anchor } from '@/components/Anchor';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const View: FC = () => {
  const t = useTranslations('support');

  return (
    <div className="support-page">
      <p className="subtitle">{t('subtitle')}</p>
      <div className="contact-cards">
        <div className="report-issue">
          <ContactCard
            title={t('reportIssue.title')}
            description={t('reportIssue.description')}
            Icon={WarningAmberIcon}
          />
          <p className="status-action">
            {t.rich('reportIssue.statusNote', {
              statusLink: (chunks) => (
                <Anchor href={'https://status.dimo.org/'} className="primary">
                  {chunks}
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Anchor>
              ),
            })}
          </p>
        </div>
        <ContactCard
          title={t('faqs.title')}
          description={t('faqs.description')}
          Icon={MenuBook}
        />
        <ContactCard
          title={t('featureRequest.title')}
          description={t('featureRequest.description')}
          Icon={LightBulb}
        />
      </div>
    </div>
  );
};

export default View;
