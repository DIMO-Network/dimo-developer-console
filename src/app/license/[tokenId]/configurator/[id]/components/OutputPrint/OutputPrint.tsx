import { FC, useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import {
  DynamicFormProps,
  ComponentType,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { FragmentType, useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import configuration from '@/config';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useFormContext } from 'react-hook-form';

interface IOutputPrintProps {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
}

type RawCode = { __raw: string };

const raw = (code: string): RawCode => ({ __raw: code });

export const OutputPrint: FC<IOutputPrintProps> = ({ license }) => {
  const fragment = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, license);
  const [viewMode, setViewMode] = useState<'code' | 'url'>('code');
  const { watch } = useFormContext<DynamicFormProps>();
  const values = watch();

  const getBaseUrl = (): string => {
    if (configuration.environment === 'production') {
      return 'https://login.dimo.org';
    }
    return 'https://login.dev.dimo.org';
  };

  const parseArray = (val?: string) =>
    val
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const tryParseJSON = (val?: string) => {
    try {
      return val ? JSON.parse(val) : {};
    } catch {
      return {};
    }
  };

  const formatProps = (props: Record<string, unknown>): string => {
    return Object.entries(props)
      .filter(([, v]) => {
        if (v === undefined || v === null || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
      .map(([k, v]) => {
        if ((v as RawCode)?.__raw) return `  ${k}={${(v as RawCode).__raw}}`;
        if (typeof v === 'string') return `  ${k}="${v}"`;
        if (typeof v === 'boolean') return `  ${k}={${v}}`;
        if (Array.isArray(v))
          return `  ${k}={[${v
            .map((x) =>
              (x as RawCode)?.__raw
                ? (x as RawCode).__raw
                : typeof x === 'string'
                  ? `"${x}"`
                  : x,
            )
            .join(`,\n${''.padEnd(k.length + 5, ' ')}`)}]}`;
        if (typeof v === 'object') {
          return `  ${k}={${JSON.stringify(v, null, 2)
            .split('\n')
            .map((line, i) => (i === 0 ? line : '  ' + line))
            .join('\n')}}`;
        }
        return `  ${k}={${v}}`;
      })
      .join('\n');
  };

  const formatComponent = (component: ComponentType) => {
    switch (component) {
      case 'LoginWithDimo':
        return 'EMAIL_INPUT';
      case 'ShareVehiclesWithDimo':
        return 'VEHICLE_MANAGER';
      case 'ExecuteAdvancedTransactionWithDimo':
        return 'ADVANCED_TRANSACTION';
    }
  };

  function formatDate(date?: Date) {
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}-${dd}-${yyyy}`;
  }

  const buildUrl = (): string => {
    const params = new URLSearchParams();

    const add = (key: string, val: unknown) => {
      if (val === undefined || val === null || val === '') return;
      if (Array.isArray(val)) {
        if (val.length === 0) return;
        params.set(key, val.join(','));
      } else if (typeof val === 'object') {
        params.set(key, JSON.stringify(val));
      } else {
        params.set(key, String(val));
      }
    };

    // Shared
    add('clientId', fragment?.clientId);
    add('redirectUri', values.redirectUri);
    add('entryState', formatComponent(values.component));
    add('utm', values.utm);
    add(
      'expirationDate',
      values.expirationDate ? formatDate(new Date(values.expirationDate)) : undefined,
    );

    if (values.component === 'LoginWithDimo') {
      add('vehicles', parseArray(values.vehicles));
      add('vehicleMakes', parseArray(values.vehicleMakes));
      add('powerTrainTypes', parseArray(values.powerTrainTypes));
    }

    if (values.component === 'ShareVehiclesWithDimo') {
      if (values.permissionsMode === 'template') {
        add('permissionTemplateId', values.permissionTemplateId);
      } else if (values.permissionsMode === 'custom') {
        const permissionValues = PERMISSIONS.map((p) => {
          const k = values.permissions?.find((vp) => vp === p.key);
          if (k) return '1';
          return '0';
        });
        add('permissions', permissionValues?.join(''));
      }
    }

    if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
      add('value', values.value);
      add('abi', tryParseJSON(values.abi as string));
      add('functionName', values.functionName);
      add('args', parseArray(values.args as string));
    }

    const baseUrl = getBaseUrl();

    return `${baseUrl}/?${params.toString()}`;
  };

  const renderSnippet = () => {
    const baseProps: Record<string, unknown> = {
      mode: values.mode,
      utm: values.utm,
      altTitle: values.altTitle,
      authenticatedLabel: values.authenticatedLabel,
      unAuthenticatedLabel: values.unAuthenticatedLabel,
      expirationDate: values.expirationDate
        ? formatDate(new Date(values.expirationDate))
        : undefined,
      onSuccess: raw('(authData) => console.log("Success:", authData)'),
      onError: raw('(error) => console.error("Error:", error)'),
    };

    let codeSnippet = '';

    if (values.component === 'LoginWithDimo') {
      const props: Record<string, unknown> = {
        ...baseProps,
        vehicles: parseArray(values.vehicles),
        vehicleMakes: parseArray(values.vehicleMakes),
        powerTrainTypes: parseArray(values.powerTrainTypes),
      };
      codeSnippet = `<LoginWithDimo\n${formatProps(props)}\n/>`;
    }

    if (values.component === 'ShareVehiclesWithDimo') {
      const props: Record<string, unknown> = {
        ...baseProps,
        permissionTemplateId:
          values.permissionsMode === 'template' ? values.permissionTemplateId : undefined,
        permissions:
          values.permissionsMode === 'custom'
            ? values.permissions?.map((k: string) =>
                raw(PERMISSIONS.find((p) => p.key === k)?.enum ?? 'none'),
              )
            : undefined,
      };
      codeSnippet = `<ShareVehiclesWithDimo\n${formatProps(props)}\n/>`;
    }

    if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
      const props: Record<string, unknown> = {
        ...baseProps,
        value: values.value,
        abi: tryParseJSON(values.abi as string),
        functionName: values.functionName,
        args: parseArray(values.args as string),
      };
      codeSnippet = `<ExecuteAdvanceTransactionWithDimo\n${formatProps(props)}\n/>`;
    }

    return `initializeDimoSDK({\n\tclientId: '${fragment?.clientId ?? ''}',\n\tredirectUri: '${values.redirectUri ?? ''}',\n});\n\n${codeSnippet}`;
  };

  return (
    <>
      {/* Toggle */}
      <div className="pt-4">
        <label className="block font-semibold mb-1">View as:</label>
        <SegmentedControl
          value={viewMode}
          options={[
            { value: 'code', label: 'Code' },
            { value: 'url', label: 'Url' },
          ]}
          onChange={(value) => setViewMode(value)}
        />
      </div>

      {/* Output */}
      <div className="pt-4 relative">
        <h3 className="font-semibold mb-2">Generated Code</h3>
        {viewMode === 'code' ? (
          <SyntaxHighlighter
            language="tsx"
            style={oneDark}
            customStyle={{ borderRadius: '0.5rem', padding: '1rem' }}
          >
            {renderSnippet()}
          </SyntaxHighlighter>
        ) : (
          <pre className="bg-surface-raised p-4 rounded overflow-x-auto text-sm whitespace-pre-wrap">
            {buildUrl()}
          </pre>
        )}

        <button
          className="absolute top-2 right-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shadow-md"
          onClick={() =>
            navigator.clipboard.writeText(
              viewMode === 'code' ? renderSnippet() : buildUrl(),
            )
          }
        >
          Copy
        </button>
      </div>
    </>
  );
};
