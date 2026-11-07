import { useTranslations } from 'next-intl';
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
  placeholder,
  label,
  error,
  disabled = false,
}) => {
  const t = useTranslations('common');
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

  const validateAssetDIDs = useCallback(
    (ids: string[]): string => {
      if (ids.length === 0) return '';

      for (const id of ids) {
        if (id.trim().length === 0) {
          return t('assetDids.empty');
        }

        if (id.length > 200) {
          return t('assetDids.tooLong', { id });
        }
      }

      if (ids.length > 1000) {
        return t('assetDids.tooMany');
      }

      return '';
    },
    [t],
  );

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
      <Label>{label ?? t('assetDids.label')}</Label>
      <TextArea
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder ?? t('assetDids.placeholder')}
        disabled={disabled}
        rows={6}
        className={displayError ? 'border-negative' : ''}
      />

      {stats.total > 0 && (
        <div className="text-body-sm text-muted">
          {stats.unique !== stats.total
            ? t('assetDids.enteredUnique', { count: stats.total, unique: stats.unique })
            : t('assetDids.entered', { count: stats.total })}
        </div>
      )}

      {displayError && <TextError errorMessage={displayError} />}

      <div className="text-body-sm text-muted">
        <p>{t('assetDids.helpIntro')}</p>
        <ul className="list-disc mt-1 space-y-1">
          <li>
            <div>{t('assetDids.helpPerLine')}</div>
            <div className="rounded-control bg-control px-3 py-2 mt-1 font-mono text-code text-fg">
              did:erc721:137:0x123:123
              <br />
              did:erc721:137:0x456:456
              <br />
              did:erc721:137:0x789:789
            </div>
          </li>
          <li>
            <div>{t('assetDids.helpComma')}</div>
            <div className="rounded-control bg-control px-3 py-2 mt-1 font-mono text-code text-fg">
              did:erc721:137:0x123:123, did:erc721:137:0x456:456, did:erc721:137:0x789:789
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};
