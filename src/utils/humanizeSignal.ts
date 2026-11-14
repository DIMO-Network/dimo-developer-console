// Readable labels for VSS-style camelCase names. The named signals are the ones
// people search for, labelled by common `signals.<name>`; everything else is
// split on capitals and digits.
export const NAMED_SIGNALS = [
  'speed',
  'powertrainTransmissionTravelledDistance',
  'powertrainCombustionEngineSpeed',
  'powertrainFuelSystemRelativeLevel',
  'powertrainRange',
  'powertrainTractionBatteryStateOfChargeCurrent',
  'powertrainTractionBatteryChargingIsCharging',
  'currentLocationCoordinates',
  'currentLocationApproximateCoordinates',
  'currentLocationLatitude',
  'currentLocationLongitude',
  'obdDTCList',
  'obdEngineLoad',
  'obdRunTime',
  'lowVoltageBatteryCurrentVoltage',
  'exteriorAirTemperature',
  'isIgnitionOn',
] as const;

const NAMED: ReadonlySet<string> = new Set(NAMED_SIGNALS);

// Pass the common-namespace `t`. The split of an unnamed signal is derived from
// its identifier, so it reads the same in every locale.
export const humanizeSignal = (name: string, t: (key: string) => string): string => {
  if (NAMED.has(name)) return t(`signals.${name}`);
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
