import { FC, useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Button } from '@/components/Button';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import {
  buildSnippet,
  configurationLink,
} from '@/app/license/[tokenId]/configurator/utils/configuration';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useFormContext } from 'react-hook-form';

interface IOutputPrintProps {
  clientId: string;
}

/** The saved configuration's link, or the SDK code for the current values. */
export const OutputPrint: FC<IOutputPrintProps> = ({ clientId }) => {
  const [viewMode, setViewMode] = useState<'code' | 'url'>('url');
  const { watch } = useFormContext<DynamicFormProps>();
  const values = watch();

  const buildUrl = () =>
    values.configuration_id ? configurationLink(values.configuration_id) : '';

  const renderSnippet = () => buildSnippet(values, clientId);

  return (
    <>
      {/* Toggle */}
      <div className="pt-4">
        <label className="mb-1 block text-label text-muted">View as:</label>
        <SegmentedControl
          value={viewMode}
          options={[
            { value: 'code', label: 'Code' },
            { value: 'url', label: 'URL' },
          ]}
          onChange={(value) => setViewMode(value)}
        />
      </div>

      {/* Output */}
      <div className="pt-4 relative">
        <h3 className="mb-2 text-card-title text-ink">Generated code</h3>
        {viewMode === 'code' ? (
          <SyntaxHighlighter
            language="tsx"
            style={oneDark}
            customStyle={{
              borderRadius: '10px',
              padding: '1rem',
              margin: 0,
              fontSize: '13px',
              lineHeight: '20px',
            }}
          >
            {renderSnippet()}
          </SyntaxHighlighter>
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-control bg-control p-4 font-mono text-code text-fg">
            {buildUrl()}
          </pre>
        )}

        <Button
          variant="secondary"
          className="absolute right-2 top-2"
          onClick={() =>
            navigator.clipboard.writeText(
              viewMode === 'code' ? renderSnippet() : buildUrl(),
            )
          }
        >
          Copy
        </Button>
      </div>
    </>
  );
};
