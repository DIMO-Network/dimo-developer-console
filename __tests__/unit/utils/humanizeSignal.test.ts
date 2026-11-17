import { getTranslations } from 'next-intl/server';
import { humanizeSignal, NAMED_SIGNALS } from '@/utils/humanizeSignal';

it.each([
  ['speed', 'Speed'],
  ['powertrainTransmissionTravelledDistance', 'Odometer'],
  ['powertrainCombustionEngineSpeed', 'Engine speed'],
  ['obdDTCList', 'Diagnostic codes'],
  ['chassisAxleRow1WheelLeftTirePressure', 'Chassis axle row 1 wheel left tire pressure'],
  ['isIgnitionOn', 'Ignition on'],
  ['harshBraking', 'Harsh braking'],
])('%s → %s', async (name, label) => {
  expect(humanizeSignal(name, await getTranslations('common'))).toBe(label);
});

it('labels every named signal from messages', async () => {
  const t = await getTranslations('common');
  for (const name of NAMED_SIGNALS)
    expect(humanizeSignal(name, t)).toBe(t(`signals.${name}`));
});
