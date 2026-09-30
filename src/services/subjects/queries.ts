// Pure GraphQL request builders for the Telemetry and Fetch APIs. Every value is
// a variable; the only interpolation is the signal selection set, and each name
// is checked against the subject's availableSignals first.

export type GqlRequest = { query: string; variables: Record<string, unknown> };

export class InvalidSignalError extends Error {
  constructor(name: string, message = `Unknown signal "${name}"`) {
    super(message);
    this.name = 'InvalidSignalError';
  }
}

const SIGNAL_NAME = /^[a-zA-Z][a-zA-Z0-9]*$/;

// Signals whose value is an object; everything else is `{ timestamp value }`.
export const COMPLEX_VALUE_FIELDS: Record<string, string> = {
  currentLocationCoordinates: '{ latitude longitude hdop }',
  currentLocationApproximateCoordinates: '{ latitude longitude hdop }',
};

export const isLocationSignal = (name: string) =>
  Object.hasOwn(COMPLEX_VALUE_FIELDS, name);

// Signals typed String in telemetry-api's schema/signals-events_gen.graphqls:
// in `signals` they take `(agg: StringAggregation!)`, not a FloatAggregation,
// so they can't be charted. signalsLatest reads them like any other signal.
export const STRING_SIGNALS: ReadonlySet<string> = new Set([
  'obdDTCList',
  'obdFuelTypeName',
  'powertrainCombustionEngineEngineOilLevel',
  'powertrainFuelSystemSupportedFuelTypes',
  'powertrainTransmissionRetarderTorqueMode',
  'powertrainType',
]);

export const isStringSignal = (name: string) => STRING_SIGNALS.has(name);

const checkSignals = (signals: string[], available: string[]) => {
  if (!signals.length) throw new InvalidSignalError('');
  const allowed = new Set(available);
  for (const s of signals) {
    if (!SIGNAL_NAME.test(s) || !allowed.has(s)) throw new InvalidSignalError(s);
  }
};

const sourceFilter = (source?: string) => (source ? { source } : null);

// ── Telemetry ────────────────────────────────────────────────────────────

export const dataSummaryQuery = (tokenId: number, source?: string): GqlRequest => ({
  query: `query DataSummary($tokenId: Int!, $filter: SignalFilter) {
  dataSummary(tokenId: $tokenId, filter: $filter) {
    numberOfSignals
    availableSignals
    firstSeen
    lastSeen
    signalDataSummary { name numberOfSignals firstSeen lastSeen }
    eventDataSummary { name numberOfEvents firstSeen lastSeen }
  }
}`,
  variables: { tokenId, filter: sourceFilter(source) },
});

export const availableSignalsQuery = (tokenId: number, source?: string): GqlRequest => ({
  query: `query AvailableSignals($tokenId: Int!, $filter: SignalFilter) {
  availableSignals(tokenId: $tokenId, filter: $filter)
}`,
  variables: { tokenId, filter: sourceFilter(source) },
});

export const signalsLatestQuery = (
  tokenId: number,
  available: string[],
  source?: string,
): GqlRequest => {
  checkSignals(available, available);
  const fields = available
    .map((s) => {
      const sub = isLocationSignal(s) ? COMPLEX_VALUE_FIELDS[s] : undefined;
      return sub ? `    ${s} { timestamp value ${sub} }` : `    ${s} { timestamp value }`;
    })
    .join('\n');
  return {
    query: `query SignalsLatest($tokenId: Int!, $filter: SignalFilter) {
  signalsLatest(tokenId: $tokenId, filter: $filter) {
    lastSeen
${fields}
  }
}`,
    variables: { tokenId, filter: sourceFilter(source) },
  };
};

export type FloatAggregation = 'AVG' | 'MED' | 'MAX' | 'MIN' | 'RAND' | 'FIRST' | 'LAST';

const AGGS = new Set<FloatAggregation>([
  'AVG',
  'MED',
  'MAX',
  'MIN',
  'RAND',
  'FIRST',
  'LAST',
]);

export const signalsQuery = (input: {
  tokenId: number;
  signals: string[];
  available: string[];
  agg: FloatAggregation;
  interval: string; // e.g. "1h", "5m"
  from: string;
  to: string;
  source?: string;
}): GqlRequest => {
  if (!AGGS.has(input.agg)) throw new Error(`Unknown aggregation "${input.agg}"`);
  const chosen = input.signals.filter((s) => !isLocationSignal(s));
  checkSignals(chosen, input.available);
  const text = chosen.find(isStringSignal);
  if (text) {
    throw new InvalidSignalError(
      text,
      `"${text}" is a text signal and has no ${input.agg} aggregation`,
    );
  }
  const fields = chosen.map((s) => `    ${s}(agg: ${input.agg})`).join('\n');
  return {
    query: `query Signals($tokenId: Int!, $from: Time!, $to: Time!, $interval: String!, $filter: SignalFilter) {
  signals(tokenId: $tokenId, from: $from, to: $to, interval: $interval, filter: $filter) {
    timestamp
${fields}
  }
}`,
    variables: {
      tokenId: input.tokenId,
      from: input.from,
      to: input.to,
      interval: input.interval,
      filter: sourceFilter(input.source),
    },
  };
};

export const eventsQuery = (input: {
  tokenId: number;
  from: string;
  to: string;
  source?: string;
}): GqlRequest => ({
  query: `query Events($tokenId: Int!, $from: Time!, $to: Time!, $filter: EventFilter) {
  events(tokenId: $tokenId, from: $from, to: $to, filter: $filter) {
    timestamp name source durationNs metadata
  }
}`,
  variables: {
    tokenId: input.tokenId,
    from: input.from,
    to: input.to,
    filter: input.source ? { source: { eq: input.source } } : null,
  },
});

export type DetectionMechanism =
  | 'ignitionDetection'
  | 'frequencyAnalysis'
  | 'changePointDetection'
  | 'idling'
  | 'refuel'
  | 'recharge';

export type SegmentConfig = {
  maxGapSeconds: number;
  minSegmentDurationSeconds: number;
  signalCountThreshold: number;
  maxIdleRpm: number;
  minIncreasePercent: number | null;
};

// dimo-admin's defaults, which match the API's documented ones.
export const SEGMENT_DEFAULTS: SegmentConfig = {
  maxGapSeconds: 300,
  minSegmentDurationSeconds: 240,
  signalCountThreshold: 10,
  maxIdleRpm: 1000,
  minIncreasePercent: null,
};

const SEGMENT_FIELDS = `
    start { timestamp value { latitude longitude hdop } }
    end { timestamp value { latitude longitude hdop } }
    duration isOngoing startedBeforeRange
    signals { name agg value }
    eventCounts { name count }`;

export const segmentsQuery = (input: {
  tokenId: number;
  from: string;
  to: string;
  mechanism: DetectionMechanism;
  config?: SegmentConfig;
  limit?: number;
  after?: string | null;
}): GqlRequest => ({
  query: `query Segments($tokenId: Int!, $from: Time!, $to: Time!, $mechanism: DetectionMechanism!, $config: SegmentConfig, $limit: Int, $after: Time) {
  segments(tokenId: $tokenId, from: $from, to: $to, mechanism: $mechanism, config: $config, limit: $limit, after: $after) {${SEGMENT_FIELDS}
  }
}`,
  variables: {
    tokenId: input.tokenId,
    from: input.from,
    to: input.to,
    mechanism: input.mechanism,
    config: input.config ?? SEGMENT_DEFAULTS,
    limit: input.limit ?? 100,
    after: input.after ?? null,
  },
});

export const dailyActivityQuery = (input: {
  tokenId: number;
  from: string;
  to: string;
  mechanism: DetectionMechanism;
  config?: SegmentConfig;
}): GqlRequest => ({
  query: `query DailyActivity($tokenId: Int!, $from: Time!, $to: Time!, $mechanism: DetectionMechanism!, $config: SegmentConfig, $timezone: String) {
  dailyActivity(tokenId: $tokenId, from: $from, to: $to, mechanism: $mechanism, config: $config, timezone: $timezone) {
    start { timestamp } end { timestamp } segmentCount duration
    signals { name agg value }
    eventCounts { name count }
  }
}`,
  variables: {
    tokenId: input.tokenId,
    from: input.from,
    to: input.to,
    mechanism: input.mechanism,
    config: input.config ?? SEGMENT_DEFAULTS,
    timezone: 'UTC',
  },
});

// ── Fetch ────────────────────────────────────────────────────────────────

export type CloudEventFilter = {
  id?: string;
  type?: string;
  source?: string;
  producer?: string;
  dataversion?: string;
  after?: string;
  before?: string;
};

const clean = (f: CloudEventFilter): CloudEventFilter | null => {
  const entries = Object.entries(f).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? Object.fromEntries(entries) : null;
};

const HEADER =
  'header { id source producer subject time type datacontenttype dataschema dataversion tags }';

export const availableCloudEventTypesQuery = (
  did: string,
  filter: CloudEventFilter = {},
): GqlRequest => ({
  query: `query AvailableCloudEventTypes($did: String!, $filter: CloudEventFilter) {
  availableCloudEventTypes(did: $did, filter: $filter) { type count firstSeen lastSeen }
}`,
  variables: { did, filter: clean(filter) },
});

export const latestCloudEventQuery = (
  did: string,
  filter: CloudEventFilter,
  includeDataUrl: boolean,
): GqlRequest => ({
  query: `query LatestCloudEvent($did: String!, $filter: CloudEventFilter) {
  latestCloudEvent(did: $did, filter: $filter) { ${HEADER} data${includeDataUrl ? ' dataUrl' : ''} }
}`,
  variables: { did, filter: clean(filter) },
});

export const cloudEventsQuery = (
  did: string,
  filter: CloudEventFilter,
  limit: number,
  includeDataUrl: boolean,
): GqlRequest => ({
  query: `query CloudEvents($did: String!, $filter: CloudEventFilter, $limit: Int) {
  cloudEvents(did: $did, filter: $filter, limit: $limit) { ${HEADER} data${includeDataUrl ? ' dataUrl' : ''} }
}`,
  variables: {
    did,
    filter: clean(filter),
    limit: Math.min(100, Math.max(1, Math.floor(limit) || 1)),
  },
});

export const latestIndexQuery = (
  did: string,
  filter: CloudEventFilter = {},
): GqlRequest => ({
  query: `query LatestIndex($did: String!, $filter: CloudEventFilter) {
  latestIndex(did: $did, filter: $filter) { ${HEADER} indexKey }
}`,
  variables: { did, filter: clean(filter) },
});

export const indexesQuery = (
  did: string,
  filter: CloudEventFilter,
  limit: number,
): GqlRequest => ({
  query: `query Indexes($did: String!, $filter: CloudEventFilter, $limit: Int) {
  indexes(did: $did, filter: $filter, limit: $limit) { ${HEADER} indexKey }
}`,
  variables: {
    did,
    filter: clean(filter),
    limit: Math.min(100, Math.max(1, Math.floor(limit) || 1)),
  },
});

// One request for every rail item's latest payload time: metadata only. Each
// entry is a subject's Fetch scope (a device is the vehicle DID + producer).
export const freshnessQuery = (
  scopes: { did: string; producer?: string }[],
): GqlRequest => {
  if (!scopes.length) throw new Error('freshnessQuery needs at least one DID');
  const decl = scopes
    .map((_, i) => `$d${i}: String!, $f${i}: CloudEventFilter`)
    .join(', ');
  const fields = scopes
    .map(
      (_, i) =>
        `  s${i}: latestIndex(did: $d${i}, filter: $f${i}) { header { time type source producer } }`,
    )
    .join('\n');
  return {
    query: `query Freshness(${decl}) {\n${fields}\n}`,
    variables: Object.fromEntries(
      scopes.flatMap((s, i) => [
        [`d${i}`, s.did],
        [`f${i}`, s.producer ? { producer: s.producer } : null],
      ]),
    ),
  };
};

// What "Copy query" puts on the clipboard.
export const formatGraphQL = (req: GqlRequest): string =>
  `${req.query}\n\n# variables\n${JSON.stringify(req.variables, null, 2)}`;

export const lastSeenQuery = (tokenId: number): GqlRequest => ({
  query: `query LastSeen($tokenId: Int!) {
  signalsLatest(tokenId: $tokenId) { lastSeen }
}`,
  variables: { tokenId },
});
