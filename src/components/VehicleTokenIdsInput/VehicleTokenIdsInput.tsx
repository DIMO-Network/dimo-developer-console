import { useTranslations } from 'next-intl';
import React, { useState, useCallback, useMemo } from 'react';
import { TextArea } from '@/components/TextArea';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';

interface VehicleTokenIdsInputProps {
  vehicleTokenIds: string[];
  onChange: (tokenIds: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const VehicleTokenIdsInput: React.FC<VehicleTokenIdsInputProps> = ({
  vehicleTokenIds,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
}) => {
  const t = useTranslations('common');
  const [inputValue, setInputValue] = useState(vehicleTokenIds.join('\n'));
  const [validationError, setValidationError] = useState<string>('');

  const parseTokenIds = useCallback((text: string): string[] => {
    if (!text.trim()) return [];

    // Split by newlines first, then by commas, then filter and trim
    const ids = text
      .split(/[\n,]/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    return Array.from(new Set(ids)); // Remove duplicates
  }, []);

  const validateTokenIds = useCallback(
    (ids: string[]): string => {
      if (ids.length === 0) return '';

      for (const id of ids) {
        if (!/^\d+$/.test(id)) {
          return t('vehicleTokenIds.invalid', { id });
        }
      }

      if (ids.length > 1000) {
        return t('vehicleTokenIds.tooMany');
      }

      return '';
    },
    [t],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      const parsedIds = parseTokenIds(value);
      const validationErr = validateTokenIds(parsedIds);

      setValidationError(validationErr);

      if (!validationErr) {
        onChange(parsedIds);
      }
    },
    [parseTokenIds, validateTokenIds, onChange],
  );

  const stats = useMemo(() => {
    const parsedIds = parseTokenIds(inputValue);
    return {
      total: parsedIds.length,
      unique: Array.from(new Set(parsedIds)).length,
    };
  }, [inputValue, parseTokenIds]);

  const displayError = error || validationError;

  return (
    <div className="flex flex-col gap-2.5">
      <Label>{label ?? t('vehicleTokenIds.label')}</Label>
      <TextArea
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder ?? t('vehicleTokenIds.placeholder')}
        disabled={disabled}
        rows={6}
        className={displayError ? 'border-negative' : ''}
      />

      {stats.total > 0 && (
        <div className="text-sm text-muted">
          {stats.unique !== stats.total
            ? t('vehicleTokenIds.enteredUnique', {
                count: stats.total,
                unique: stats.unique,
              })
            : t('vehicleTokenIds.entered', { count: stats.total })}
        </div>
      )}

      {displayError && <TextError errorMessage={displayError} />}

      <div className="text-sm text-muted">
        <p>{t('vehicleTokenIds.helpIntro')}</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>{t('vehicleTokenIds.helpPerLine')}</li>
          <li>{t('vehicleTokenIds.helpComma')}</li>
          <li>{t('vehicleTokenIds.helpMixed')}</li>
        </ul>
      </div>
    </div>
  );
};
