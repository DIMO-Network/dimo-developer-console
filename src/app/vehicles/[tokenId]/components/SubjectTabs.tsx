'use client';
import { FC } from 'react';
import classNames from 'classnames';
import { useTranslations } from 'next-intl';
import type { Subject } from '@/services/subjects/graph';
import type { VehicleTab } from '../hooks/useVehicleUrlState';

// The license-details pill tabs (DESIGN.md "Tabs"); the set comes from the
// subject's capabilities, so devices have no Trips and the account has Documents.
export const SubjectTabs: FC<{
  subject: Subject;
  tab: VehicleTab;
  onChange: (tab: VehicleTab) => void;
  disabled?: boolean;
}> = ({ subject, tab, onChange, disabled }) => {
  const t = useTranslations('vehicles');
  return (
    <nav className="vehicle-tabs" role="tablist" aria-label={t('tabs.label')}>
      {subject.capabilities.map((id) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={tab === id}
          disabled={disabled}
          className={classNames(
            'vehicle-tab',
            tab === id && !disabled && 'vehicle-tab--active',
            disabled && 'opacity-40',
          )}
          onClick={() => onChange(id)}
        >
          {t(`tabs.${id}`)}
        </button>
      ))}
    </nav>
  );
};
