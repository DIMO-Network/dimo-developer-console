import {
  buildConfiguration,
  buildSnippet,
  toEndDate,
  toFormValues,
  toLoginQuery,
} from '@/app/license/[tokenId]/configurator/utils/configuration';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

const meta = { id: 'cfg-1', configuration_name: 'My config' };

const share = (values: Partial<DynamicFormProps> = {}) =>
  ({
    component: 'ShareVehiclesWithDimo',
    client_id: '0xclient',
    configuration_name: 'My config',
    redirectUri: 'https://app.example/callback',
    permissionsMode: 'custom',
    permissions: ['NONLOCATION_TELEMETRY', 'CURRENT_LOCATION'],
    expirationDate: new Date(2027, 2, 1).toISOString(),
    ...values,
  }) as DynamicFormProps;

describe('buildConfiguration', () => {
  it('saves share filters as lists under the keys the login reads', () => {
    const saved = buildConfiguration(
      share({
        vehicles: '1, 2,,3',
        vehicleMakes: 'Toyota, Lexus',
        powertrainTypes: 'BEV',
      }),
    );
    expect(saved).toMatchObject({
      entryState: 'VEHICLE_MANAGER',
      vehicles: ['1', '2', '3'],
      vehicleMakes: ['Toyota', 'Lexus'],
      powertrainTypes: ['BEV'],
      permissionsMode: 'custom',
      permissions: '10100000',
    });
    expect(saved).not.toHaveProperty('powerTrainTypes');
  });

  it('saves the end date as noon UTC on the chosen day', () => {
    expect(buildConfiguration(share()).expirationDate).toBe('2027-03-01T12:00:00.000Z');
    expect(toEndDate(new Date(2027, 11, 31))).toBe('2027-12-31T12:00:00.000Z');
    expect(toEndDate('')).toBeUndefined();
  });

  it('saves documents as agreements the login signs', () => {
    const saved = buildConfiguration(
      share({ documents: ['dimo.document.vehicle.*', 'dimo.raw.driver.*'] }),
    );
    expect(saved.cloudEvent).toEqual([
      { eventType: 'dimo.document.vehicle.*', ids: [], tags: ['documents'] },
      { eventType: 'dimo.raw.driver.*', ids: [], tags: ['documents'] },
    ]);
  });

  it('saves language and a non-default email request', () => {
    expect(
      buildConfiguration(share({ language: 'ja', emailRequest: 'required' })),
    ).toMatchObject({ language: 'ja', emailRequest: 'required', forceEmail: true });
    const none = buildConfiguration(share({ emailRequest: 'none' }));
    expect(none.emailRequest).toBe('none');
    expect(none).not.toHaveProperty('forceEmail');
    const optional = buildConfiguration(
      share({ language: '', emailRequest: 'optional' }),
    );
    expect(optional).not.toHaveProperty('emailRequest');
    expect(optional).not.toHaveProperty('language');
  });

  it('saves the template id when the mode was never touched', () => {
    const saved = buildConfiguration(
      share({ permissionsMode: undefined, permissionTemplateId: '1' }),
    );
    expect(saved).toMatchObject({
      permissionsMode: 'template',
      permissionTemplateId: '1',
    });
    expect(saved).not.toHaveProperty('permissions');
  });

  it('keeps vehicle filters off a plain login', () => {
    const saved = buildConfiguration({
      ...share(),
      component: 'LoginWithDimo',
      brandName: 'Acme',
    } as DynamicFormProps);
    expect(saved).toMatchObject({ entryState: 'EMAIL_INPUT', brandName: 'Acme' });
    expect(saved).not.toHaveProperty('permissions');
    expect(saved).not.toHaveProperty('vehicles');
  });
});

describe('toFormValues', () => {
  it('round-trips a saved configuration', () => {
    const values = share({
      configuration_id: 'cfg-1',
      vehicles: '1, 2',
      vehicleMakes: 'Toyota',
      powertrainTypes: 'BEV, HEV',
      documents: ['dimo.document.driver.*'],
      language: 'ja',
      emailRequest: 'none',
      brandName: 'Acme',
    });
    const loaded = toFormValues(buildConfiguration(values), meta);
    expect(buildConfiguration(loaded)).toEqual(buildConfiguration(values));
    expect(loaded).toMatchObject({
      component: 'ShareVehiclesWithDimo',
      configuration_id: 'cfg-1',
      configuration_name: 'My config',
      vehicles: '1, 2',
      powertrainTypes: 'BEV, HEV',
      documents: ['dimo.document.driver.*'],
      language: 'ja',
      emailRequest: 'none',
      expirationDate: new Date(2027, 2, 1).toISOString(),
    });
  });

  it('repairs what older versions saved', () => {
    const loaded = toFormValues(
      {
        entryState: 'VEHICLE_MANAGER',
        redirectUri: 'https://app.example/callback',
        expirationDate: '03-01-2027',
        vehicleMakes: 'Toyota,Lexus',
        powerTrainTypes: 'ICE,HEV',
        permissionsMode: 'custom',
        permissions: '10100000',
        cloudEvent: JSON.stringify({
          eventType: 'dimo.attestation',
          source: '*',
          ids: ['*'],
          tags: ['Insurance', 'DriversLicense', 'ServiceRecords'],
        }),
      },
      meta,
    );
    expect(loaded).toMatchObject({
      expirationDate: new Date(2027, 2, 1).toISOString(),
      vehicleMakes: 'Toyota, Lexus',
      powertrainTypes: 'ICE, HEV',
      permissions: ['NONLOCATION_TELEMETRY', 'CURRENT_LOCATION'],
      documents: ['dimo.document.vehicle.*', 'dimo.document.driver.*'],
      language: '',
      emailRequest: 'optional',
    });
    const resaved = buildConfiguration(loaded);
    expect(resaved).toMatchObject({
      expirationDate: '2027-03-01T12:00:00.000Z',
      vehicleMakes: ['Toyota', 'Lexus'],
      powertrainTypes: ['ICE', 'HEV'],
    });
    expect(resaved.cloudEvent).toHaveLength(2);
  });

  it('reads the old email flag and a template without a mode', () => {
    expect(
      toFormValues({ entryState: 'EMAIL_INPUT', forceEmail: 'true' }, meta).emailRequest,
    ).toBe('required');
    expect(
      toFormValues({ entryState: 'VEHICLE_MANAGER', permissionTemplateId: '2' }, meta),
    ).toMatchObject({ permissionsMode: 'template', permissionTemplateId: '2' });
  });
});

describe('toLoginQuery', () => {
  it('repeats list keys and leaves out console-only keys', () => {
    const query = new URLSearchParams(
      toLoginQuery(
        share({ vehicleMakes: 'Toyota, Lexus', documents: ['dimo.document.vehicle.*'] }),
        '0xclient',
      ),
    );
    expect(query.get('clientId')).toBe('0xclient');
    expect(query.getAll('vehicleMakes')).toEqual(['Toyota', 'Lexus']);
    expect(JSON.parse(query.get('cloudEvent')!)).toEqual([
      { eventType: 'dimo.document.vehicle.*', ids: [], tags: ['documents'] },
    ]);
    expect(query.has('permissionsMode')).toBe(false);
  });
});

describe('buildSnippet', () => {
  it('matches the SDK', () => {
    const snippet = buildSnippet(
      share({
        documents: ['dimo.document.vehicle.*'],
        powertrainTypes: 'BEV',
        vehicleMakes: 'Toyota, Lexus',
        brandName: 'Acme',
        language: 'ja',
        emailRequest: 'required',
        tosUrl: 'https://app.example/terms',
      }),
      '0xclient',
    );
    expect(snippet).toContain("from '@dimo-network/login-with-dimo';");
    expect(snippet).toContain('  DocumentAccess,');
    expect(snippet).toContain('  Permissions,');
    expect(snippet).toContain(
      [
        'initializeDimoSDK({',
        "  clientId: '0xclient',",
        "  redirectUri: 'https://app.example/callback',",
        '  options: {',
        "    emailRequest: 'required',",
        "    language: 'ja',",
        "    tosUrl: 'https://app.example/terms',",
        '  },',
        '});',
      ].join('\n'),
    );
    expect(snippet).toContain('<ShareVehiclesWithDimo');
    expect(snippet).toContain('  mode={DimoSDKModes.POPUP}');
    expect(snippet).toContain('  documents={[DocumentAccess.VehicleDocuments]}');
    expect(snippet).toContain('  powertrainTypes={["BEV"]}');
    expect(snippet).toContain('  vehicleMakes={["Toyota", "Lexus"]}');
    expect(snippet).toContain('  expirationDate="2027-03-01T12:00:00.000Z"');
    expect(snippet).toContain('  brandOverride={{ name: "Acme" }}');
    expect(snippet).not.toContain('brandName');
    expect(snippet).not.toMatch(/\n {2}tosUrl=/);
  });

  it('leaves options out when nothing is set', () => {
    const snippet = buildSnippet(
      { ...share(), component: 'LoginWithDimo' } as DynamicFormProps,
      '0xclient',
    );
    expect(snippet).not.toContain('options:');
    expect(snippet).toContain('<LoginWithDimo');
    expect(snippet).not.toContain('permissions=');
  });

  it('escapes quotes so the code still parses', () => {
    const snippet = buildSnippet(
      share({
        utm: 'utm_campaign="spring"',
        tosUrl: "https://app.example/o'neil\\terms",
      }),
      '0xclient',
    );
    expect(snippet).toContain('  utm={"utm_campaign=\\"spring\\""}');
    expect(snippet).toContain("    tosUrl: 'https://app.example/o\\'neil\\\\terms',");
  });
});
