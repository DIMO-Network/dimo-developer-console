// Readable labels for VSS-style camelCase names. The overrides cover the names
// people search for; everything else is split on capitals and digits.
const OVERRIDES: Record<string, string> = {
  speed: 'Speed',
  powertrainTransmissionTravelledDistance: 'Odometer',
  powertrainCombustionEngineSpeed: 'Engine speed',
  powertrainFuelSystemRelativeLevel: 'Fuel level',
  powertrainRange: 'Range',
  powertrainTractionBatteryStateOfChargeCurrent: 'Battery charge',
  powertrainTractionBatteryChargingIsCharging: 'Charging',
  currentLocationCoordinates: 'Location',
  currentLocationApproximateCoordinates: 'Approximate location',
  currentLocationLatitude: 'Latitude',
  currentLocationLongitude: 'Longitude',
  obdDTCList: 'Diagnostic codes',
  obdEngineLoad: 'Engine load',
  obdRunTime: 'Engine run time',
  lowVoltageBatteryCurrentVoltage: '12V battery voltage',
  exteriorAirTemperature: 'Outside air temperature',
  isIgnitionOn: 'Ignition on',
};

export const humanizeSignal = (name: string): string => {
  const override = OVERRIDES[name];
  if (override) return override;
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
