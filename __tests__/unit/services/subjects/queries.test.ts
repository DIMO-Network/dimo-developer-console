import {
  dataSummaryQuery,
  availableSignalsQuery,
  signalsLatestQuery,
  signalsQuery,
  eventsQuery,
  segmentsQuery,
  dailyActivityQuery,
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
  cloudEventsQuery,
  latestIndexQuery,
  freshnessQuery,
  formatGraphQL,
  InvalidSignalError,
  SEGMENT_DEFAULTS,
  isLocationSignal,
  isStringSignal,
  STRING_SIGNALS,
} from '@/services/subjects/queries';

const DID = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:184223';
const SRC = 'did:ethr:137:0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E';
const DEVICE = 'did:erc721:137:0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA:48211';
const FROM = '2026-09-22T00:00:00Z';
const TO = '2026-09-29T00:00:00Z';

describe('telemetry builders', () => {
  it('dataSummary takes an optional source filter', () => {
    expect(dataSummaryQuery(184223).variables).toEqual({ tokenId: 184223, filter: null });
    expect(dataSummaryQuery(184223, SRC).variables).toEqual({
      tokenId: 184223,
      filter: { source: SRC },
    });
    expect(dataSummaryQuery(184223).query).toContain('signalDataSummary');
    expect(dataSummaryQuery(184223).query).toContain('eventDataSummary');
  });

  it('availableSignals uses variables, never interpolation', () => {
    const q = availableSignalsQuery(184223, SRC);
    expect(q.query).not.toContain('184223');
    expect(q.variables).toEqual({ tokenId: 184223, filter: { source: SRC } });
  });

  it('signalsLatest selects each available signal, with sub-fields for locations', () => {
    const q = signalsLatestQuery(184223, ['speed', 'currentLocationCoordinates']);
    expect(q.query).toContain('speed { timestamp value }');
    expect(q.query).toContain(
      'currentLocationCoordinates { timestamp value { latitude longitude hdop } }',
    );
    expect(q.query).toContain('lastSeen');
  });

  it('signals builds one aggregated field per chosen signal', () => {
    const q = signalsQuery({
      tokenId: 184223,
      signals: ['speed', 'powertrainCombustionEngineSpeed'],
      available: ['speed', 'powertrainCombustionEngineSpeed', 'obdRunTime'],
      agg: 'AVG',
      interval: '1h',
      from: FROM,
      to: TO,
    });
    expect(q.query).toContain('speed(agg: AVG)');
    expect(q.query).toContain('powertrainCombustionEngineSpeed(agg: AVG)');
    expect(q.query).not.toContain('obdRunTime');
    expect(q.variables).toEqual({
      tokenId: 184223,
      from: FROM,
      to: TO,
      interval: '1h',
      filter: null,
    });
  });

  it.each([
    ['unknown', ['odometerHack']],
    ['malformed', ['speed) { x }']],
    ['empty', []],
  ])('signals refuses %s signal names', (_, signals) => {
    expect(() =>
      signalsQuery({
        tokenId: 1,
        signals,
        available: ['speed'],
        agg: 'AVG',
        interval: '1h',
        from: FROM,
        to: TO,
      }),
    ).toThrow(InvalidSignalError);
  });

  it('events, segments and dailyActivity carry their ranges and defaults', () => {
    expect(
      eventsQuery({ tokenId: 1, from: FROM, to: TO, source: SRC }).variables,
    ).toEqual({
      tokenId: 1,
      from: FROM,
      to: TO,
      filter: { source: { eq: SRC } },
    });
    const seg = segmentsQuery({
      tokenId: 1,
      from: FROM,
      to: TO,
      mechanism: 'ignitionDetection',
    });
    expect(seg.variables).toEqual({
      tokenId: 1,
      from: FROM,
      to: TO,
      mechanism: 'ignitionDetection',
      config: SEGMENT_DEFAULTS,
      limit: 100,
      after: null,
    });
    expect(seg.query).toContain('isOngoing');
    const day = dailyActivityQuery({
      tokenId: 1,
      from: FROM,
      to: TO,
      mechanism: 'frequencyAnalysis',
    });
    expect(day.query).toContain('segmentCount');
    expect(day.query).toContain('start { timestamp }');
    expect(day.query).not.toMatch(/\bdate\b/);
    expect(day.query).toContain('timezone: $timezone');
    expect(day.variables.timezone).toBe('UTC');
  });
});

describe('fetch builders', () => {
  it('availableCloudEventTypes and latestCloudEvent take the DID as a variable', () => {
    expect(availableCloudEventTypesQuery(DID).variables).toEqual({
      did: DID,
      filter: null,
    });
    const byProducer = availableCloudEventTypesQuery(DID, { producer: DEVICE });
    expect(byProducer.query).toContain('$filter: CloudEventFilter');
    expect(byProducer.query).toContain(
      'availableCloudEventTypes(did: $did, filter: $filter)',
    );
    expect(byProducer.variables).toEqual({ did: DID, filter: { producer: DEVICE } });
    const latest = latestCloudEventQuery(DID, { type: 'dimo.status' }, true);
    expect(latest.variables).toEqual({ did: DID, filter: { type: 'dimo.status' } });
    expect(latest.query).toContain('dataUrl');
    expect(latestCloudEventQuery(DID, {}, false).query).not.toContain('dataUrl');
    expect(latestCloudEventQuery(DID, {}, false).variables).toEqual({
      did: DID,
      filter: null,
    });
  });

  it('cloudEvents clamps the limit to 1..100', () => {
    expect(cloudEventsQuery(DID, {}, 500, false).variables.limit).toBe(100);
    expect(cloudEventsQuery(DID, {}, 0, false).variables.limit).toBe(1);
    expect(cloudEventsQuery(DID, { before: TO }, 25, false).variables).toEqual({
      did: DID,
      filter: { before: TO },
      limit: 25,
    });
  });

  it('freshnessQuery aliases one latestIndex per scope, each with its own filter', () => {
    const q = freshnessQuery([{ did: DID }, { did: DID, producer: DEVICE }]);
    expect(q.query).toContain('s0: latestIndex(did: $d0, filter: $f0)');
    expect(q.query).toContain('s1: latestIndex(did: $d1, filter: $f1)');
    expect(q.query).toContain('$d0: String!');
    expect(q.query).toContain('$f1: CloudEventFilter');
    expect(q.variables).toEqual({ d0: DID, f0: null, d1: DID, f1: { producer: DEVICE } });
    expect(latestIndexQuery(DID).query).toContain('indexKey');
  });
});

it('formatGraphQL prints the query and variables for copying', () => {
  const text = formatGraphQL(availableCloudEventTypesQuery(DID));
  expect(text).toContain('availableCloudEventTypes');
  expect(text).toContain('# variables');
  expect(text).toContain(`"did": "${DID}"`);
});

describe('hardening', () => {
  it('does not resolve prototype keys as location signals', () => {
    expect(isLocationSignal('toString')).toBe(false);
    const q = signalsLatestQuery(1, ['constructor']);
    expect(q.query).toContain('constructor { timestamp value }');
    expect(q.query).not.toContain('{ latitude');
    expect(q.query).not.toContain('function');
  });

  it('refuses an unknown aggregation', () => {
    expect(() =>
      signalsQuery({
        tokenId: 1,
        signals: ['speed'],
        available: ['speed'],
        agg: 'AVG) { x }' as never,
        interval: '1h',
        from: FROM,
        to: TO,
      }),
    ).toThrow('Unknown aggregation');
  });

  it('knows the string-typed signals, and not by prototype lookup', () => {
    expect(isStringSignal('obdDTCList')).toBe(true);
    expect(isStringSignal('powertrainType')).toBe(true);
    expect(isStringSignal('speed')).toBe(false);
    expect(isStringSignal('toString')).toBe(false);
    expect(isStringSignal('constructor')).toBe(false);
    expect([...STRING_SIGNALS].sort()).toEqual([
      'obdDTCList',
      'obdFuelTypeName',
      'powertrainCombustionEngineEngineOilLevel',
      'powertrainFuelSystemSupportedFuelTypes',
      'powertrainTransmissionRetarderTorqueMode',
      'powertrainType',
    ]);
  });

  it('refuses a string signal in a float-aggregated signals query', () => {
    const run = () =>
      signalsQuery({
        tokenId: 1,
        signals: ['speed', 'obdDTCList'],
        available: ['speed', 'obdDTCList'],
        agg: 'AVG',
        interval: '1h',
        from: FROM,
        to: TO,
      });
    expect(run).toThrow(InvalidSignalError);
    expect(run).toThrow('obdDTCList');
  });

  it('refuses an empty freshness list', () => {
    expect(() => freshnessQuery([])).toThrow('at least one DID');
  });
});
