import { LocalDeveloperLicense } from '@/types/webhook';
import { SelectOption, SelectWithChevron } from '@/components/SelectWithChevron';
import React from 'react';
import { Label } from '@/components/Label';

const getOption = (license: LocalDeveloperLicense): SelectOption => ({
  label: license.label,
  value: license.clientId,
});

const getOptions = (licenses: LocalDeveloperLicense[]) => {
  return [
    { value: '', label: 'Select Developer License', isPlaceholder: true },
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
      <Label>Select a Developer License</Label>
      <SelectWithChevron
        options={getOptions(developerLicenses)}
        onChange={handleChange}
        value={selectedLicense?.clientId ?? ''}
      />
    </div>
  );
};
