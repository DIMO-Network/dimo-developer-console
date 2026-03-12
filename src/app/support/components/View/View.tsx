'use client';
import { FC } from 'react';

import { ContactCard } from '@/app/support/components/ContactCard';
import { Title } from '@/components/Title';
import { LightBulb, MenuBook, WarningAmberIcon } from '@/components/Icons';

import './View.css';
import { Anchor } from '@/components/Anchor';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const View: FC = () => {
  return (
    <div className="support-page">
      <div className="titles">
        <Title>Support</Title>
        <p className="subtitle">
          Please select an option below so our support team can address your issue.
        </p>
      </div>
      <div className="contact-cards">
        <div className="report-issue">
          <ContactCard
            title="Report an issue"
            description="If you're experiencing unexpected issues with the DIMO API please contact us here."
            Icon={WarningAmberIcon}
          />
          <p className="status-action">
            Known issues and outages can be found on our{' '}
            <Anchor href={'#'} className="primary">
              status page
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Anchor>
          </p>
        </div>
        <ContactCard
          title="FAQs"
          description="Check our FAQs for common questions and issues you may be experiencing."
          Icon={MenuBook}
        />
        <ContactCard
          title="Feature request"
          description="If you have ideas, requests, or needs which are not currently supported by the DIMO API, we’d love to hear from you."
          Icon={LightBulb}
        />
      </div>
    </div>
  );
};

export default View;
