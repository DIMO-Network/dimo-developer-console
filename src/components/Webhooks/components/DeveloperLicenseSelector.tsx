import { useTranslations } from 'next-intl';
import { LocalDeveloperLicense } from '@/types/webhook';
import { SelectOption, SelectWithChevron } from '@/components/SelectWithChevron';
import React from 'react';
import { Label } from '@/components/Label';

const getOption = (license: LocalDeveloperLicense): SelectOption => ({
  label: license.label,
  value: license.clientId,
});

const getOptions = (licenses: LocalDeveloperLicense[], placeholder: string) => {
  return [
    { value: '', label: placeholder, isPlaceholder: true },
    ...licenses.map(getOption),
  ];
};

export const DevLicenseSelector = ({
  developerLicenses,
  onChange,
  selectedLicense,
}: {
  developerLicenses: LocalDeveloperLicense[];
  onChange: (license: LocalDeveloperLicense) => void;
  selectedLicense?: LocalDeveloperLicense;
}) => {
  const t = useTranslations('common');
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectedLicense = developerLicenses.find(
      (it) => it.clientId === e.target.value,
    );
    if (newSelectedLicense) {
      onChange(newSelectedLicense);
    }
  };

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>{t('webhooks.licenseSelector.label')}</Label>
      <SelectWithChevron
        options={getOptions(developerLicenses, t('webhooks.licenseSelector.placeholder'))}
        onChange={handleChange}
        value={selectedLicense?.clientId ?? ''}
      />
    </div>
  );
};
