import React, { useState, useCallback, useMemo } from 'react';
import { TextArea } from '@/components/TextArea';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';

interface AssetDIDsInputProps {
  assetDIDs: string[];
  onChange: (assetDIDs: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const AssetDIDsInput: React.FC<AssetDIDsInputProps> = ({
  assetDIDs,
  onChange,
  placeholder = 'Enter vehicle DIDs, one per line or comma-separated',
  label = 'Asset DIDs',
  error,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState(assetDIDs.join('\n'));
  const [validationError, setValidationError] = useState<string>('');

  const parseAssetDIDs = useCallback((text: string): string[] => {
    if (!text.trim()) return [];

    // Split by newlines first, then by commas, then filter and trim
    const ids = text
      .split(/[\n,]/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    return Array.from(new Set(ids)); // Remove duplicates
  }, []);

  const validateAssetDIDs = useCallback((ids: string[]): string => {
    if (ids.length === 0) return '';

    for (const id of ids) {
      // Asset DIDs can be alphanumeric, not just numeric like vehicle token IDs
      if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
        return `Invalid vehicle DID: "${id}". Asset DIDs must contain only letters, numbers, dots, hyphens, and underscores.`;
      }
    }

    if (ids.length > 1000) {
      return 'Too many vehicle DIDs. Maximum of 1000 DIDs allowed.';
    }

    return '';
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      const parsedIds = parseAssetDIDs(value);
      const validationErr = validateAssetDIDs(parsedIds);

      setValidationError(validationErr);

      if (!validationErr) {
        onChange(parsedIds);
      }
    },
    [parseAssetDIDs, validateAssetDIDs, onChange],
  );

  const stats = useMemo(() => {
    const parsedIds = parseAssetDIDs(inputValue);
    return {
      total: parsedIds.length,
      unique: Array.from(new Set(parsedIds)).length,
    };
  }, [inputValue, parseAssetDIDs]);

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
          {stats.total} asset DID{stats.total !== 1 ? 's' : ''} entered
          {stats.unique !== stats.total && ` (${stats.unique} unique)`}
        </div>
      )}

      {displayError && <TextError errorMessage={displayError} />}

      <div className="text-sm text-text-secondary">
        <p>You can enter vehicle DIDs in the following ways:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>
            One per line: did:erc721:137:0x123, did:erc721:137:0x456, did:erc721:137:0x789
          </li>
          <li>
            Comma-separated: did:erc721:137:0x123, did:erc721:137:0x456,
            did:erc721:137:0x789
          </li>
        </ul>
      </div>
    </div>
  );
};
