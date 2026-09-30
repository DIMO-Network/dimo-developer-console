'use client';
import React, { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { saveAs } from 'file-saver';
import { CopyButton } from '@/components/CopyButton';
import { Button } from '@/components/Button';

// Prism JSON tokens mapped onto Fleet tokens so both themes read.
const THEME: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: 'rgb(var(--fg))', background: 'transparent' },
  'pre[class*="language-"]': {
    color: 'rgb(var(--fg))',
    background: 'transparent',
    margin: 0,
  },
  'property': { color: 'rgb(var(--sky))' },
  'string': { color: 'rgb(var(--accent-ink))' },
  'number': { color: 'rgb(var(--warning))' },
  'boolean': { color: 'rgb(var(--warning))' },
  'null': { color: 'rgb(var(--muted))' },
  'punctuation': { color: 'rgb(var(--muted))' },
  'operator': { color: 'rgb(var(--muted))' },
};

interface Props {
  value: unknown;
  maxHeight?: number;
  filename?: string;
  className?: string;
}

export const JsonBlock: FC<Props> = ({ value, maxHeight = 320, filename, className }) => {
  const text = JSON.stringify(value, null, 2) ?? 'undefined';
  return (
    <div data-testid="json-block" className={className}>
      <div className="flex items-center justify-end gap-1 pb-1">
        {filename && (
          <Button
            variant="ghost"
            size="md"
            onClick={() =>
              saveAs(new Blob([text], { type: 'application/json' }), filename)
            }
          >
            Download JSON
          </Button>
        )}
        <CopyButton value={text} onCopySuccessMessage="JSON copied" size="icon" />
      </div>
      <div
        className="overflow-auto rounded-control bg-control px-4 py-3 font-mono text-code"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language="json"
          style={THEME}
          customStyle={{ padding: 0, fontSize: 'inherit', lineHeight: 'inherit' }}
        >
          {text}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
