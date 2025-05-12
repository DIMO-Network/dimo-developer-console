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
    field: 'Vehicle.Powertrain.CombustionEngine.IsRunning',
    label: 'Is Ignition On',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'Vehicle.Powertrain.TractionBattery.CurrentPower',
    label: 'Battery current power',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Powertrain.TractionBattery.Charging.IsCharging',
    label: 'Battery is charging',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'Vehicle.TraveledDistance',
    label: 'Odometer',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current',
    label: 'Charge level',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Powertrain.FuelSystem.RelativeLevel',
    label: 'Fuel System Relative Level',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Powertrain.FuelSystem.AbsoluteLevel',
    label: 'Fuel System Absolute Level',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Chassis.Axle.Row1.Wheel.Left.Tire.Pressure',
    label: 'Tire pressure (front left)',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Chassis.Axle.Row1.Wheel.Right.Tire.Pressure',
    label: 'Tire pressure (front right)',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Chassis.Axle.Row2.Wheel.Left.Tire.Pressure',
    label: 'Tire pressure (back left)',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'Vehicle.Chassis.Axle.Row2.Wheel.Right.Tire.Pressure',
    label: 'Tire pressure (back right)',
    inputType: 'number',
    validation: numericValidation,
  },
];
