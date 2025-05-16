import { Webhook, WebhookFormInput } from '@/types/webhook';

export const extractCELFromWebhook = (webhook: Webhook): WebhookFormInput['cel'] => {
  const { data, trigger } = webhook;

  const operatorRegex = /([=!><]=|[><])/;
  const parts = trigger.split(operatorRegex).map((part) => part.trim());
  const operator = parts[1] ?? '';
  const value = parts[2] ?? '';

  return {
    conditions: [{ field: data, operator, value }],
    operator: 'AND',
  };
};

export const BOOL_VARIATIONS = {
  true: "'true'",
  false: "'false'",
};

const numericValidation = {
  required: 'Value is required',
  validate: (val: string) => !isNaN(Number(val)),
};
const booleanValidation = {
  required: 'Value is required',
  validate: (value: string) =>
    value === BOOL_VARIATIONS.true || value === BOOL_VARIATIONS.false,
};
export const conditionsConfig = [
  {
    field: 'isIgnitionOn',
    label: 'Is Ignition On',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryCurrentPower',
    label: 'Battery current power',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryChargingIsCharging',
    label: 'Battery is charging',
    signalType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'powertrainTransmissionTravelledDistance',
    label: 'Odometer',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryStateOfChargeCurrent',
    label: 'Charge level',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainFuelSystemRelativeLevel',
    label: 'Fuel System Relative Level',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainFuelSystemAbsoluteLevel',
    label: 'Fuel System Absolute Level',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow1WheelLeftTirePressure',
    label: 'Tire pressure (front left)',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow1WheelRightTirePressure',
    label: 'Tire pressure (front right)',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow2WheelLeftTirePressure',
    label: 'Tire pressure (back left)',
    signalType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow2WheelRightTirePressure',
    label: 'Tire pressure (back right)',
    signalType: 'number',
    validation: numericValidation,
  },
];
