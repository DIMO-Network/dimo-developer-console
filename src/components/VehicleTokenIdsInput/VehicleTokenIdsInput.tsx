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
  placeholder = 'Enter vehicle token IDs, one per line or comma-separated',
  label = 'Vehicle Token IDs',
  error,
  disabled = false,
}) => {
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

  const validateTokenIds = useCallback((ids: string[]): string => {
    if (ids.length === 0) return '';

    for (const id of ids) {
      if (!/^\d+$/.test(id)) {
        return `Invalid token ID: "${id}". All token IDs must be numeric.`;
      }
    }

    if (ids.length > 1000) {
      return 'Too many token IDs. Maximum of 1000 IDs allowed.';
    }

    return '';
  }, []);

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
      <Label>{label}</Label>
      <TextArea
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className={displayError ? 'border-feedback-error' : ''}
      />

      {stats.total > 0 && (
        <div className="text-sm text-text-secondary">
          {stats.total} token ID{stats.total !== 1 ? 's' : ''} entered
          {stats.unique !== stats.total && ` (${stats.unique} unique)`}
        </div>
      )}

      {displayError && <TextError errorMessage={displayError} />}

      <div className="text-sm text-text-secondary">
        <p>You can enter vehicle token IDs in the following ways:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>One per line: 12345, 67890, 11111</li>
          <li>Comma-separated: 12345, 67890, 11111</li>
          <li>Mixed format is also supported</li>
        </ul>
      </div>
    </div>
  );
};
