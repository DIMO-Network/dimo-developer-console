import { humanizeSignal } from '@/utils/humanizeSignal';

it.each([
  ['speed', 'Speed'],
  ['powertrainTransmissionTravelledDistance', 'Odometer'],
  ['powertrainCombustionEngineSpeed', 'Engine speed'],
  ['obdDTCList', 'Diagnostic codes'],
  ['chassisAxleRow1WheelLeftTirePressure', 'Chassis axle row 1 wheel left tire pressure'],
  ['isIgnitionOn', 'Ignition on'],
  ['harshBraking', 'Harsh braking'],
])('%s → %s', (name, label) => {
  expect(humanizeSignal(name)).toBe(label);
});
