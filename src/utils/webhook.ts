import {
  Condition,
  Webhook,
  WebhookCreateInput,
  WebhookFormInput,
} from '@/types/webhook';
import { RegisterOptions } from 'react-hook-form';

export const extractCELFromWebhook = (webhook: Webhook): WebhookFormInput['cel'] => {
  const { metricName, condition } = webhook;

  const operatorRegex = /([=!><]=|[><])/;
  const parts = condition.split(operatorRegex).map((part) => part.trim());
  const operator = parts[1] ?? '';
  const value = parts[2] ?? '';

  return {
    conditions: [{ field: metricName, operator, value }],
    operator: 'AND',
  };
};

export type InputType = 'number' | 'boolean';

interface ConditionConfig {
  field: string;
  label: string;
  inputType: InputType;
  validation: RegisterOptions;
}

const numericValidation: RegisterOptions = {
  required: 'Value is required',
  validate: (val: string) => !isNaN(Number(val)),
};

const booleanValidation: RegisterOptions = {
  required: 'Value is required',
  validate: (value: string) => {
    const parsedValue = Number(value);
    return parsedValue === 1 || parsedValue === 0;
  },
};

export const conditionsConfig: ConditionConfig[] = [
  {
    field: 'speed',
    label: 'Speed',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'isIgnitionOn',
    label: 'Is Ignition On',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'powertrainTractionBatteryCurrentPower',
    label: 'Battery current power',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryChargingIsCharging',
    label: 'Battery is charging',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'powertrainTransmissionTravelledDistance',
    label: 'Odometer',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryStateOfChargeCurrent',
    label: 'Charge level',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainFuelSystemRelativeLevel',
    label: 'Fuel System Relative Level',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainFuelSystemAbsoluteLevel',
    label: 'Fuel System Absolute Level',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow1WheelLeftTirePressure',
    label: 'Tire pressure (front left)',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow1WheelRightTirePressure',
    label: 'Tire pressure (front right)',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow2WheelLeftTirePressure',
    label: 'Tire pressure (back left)',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'chassisAxleRow2WheelRightTirePressure',
    label: 'Tire pressure (back right)',
    inputType: 'number',
    validation: numericValidation,
  },
];

export const formatWebhookFormData = (
  webhookFormData: WebhookFormInput,
): WebhookCreateInput => {
  const { metricName, condition } = formatAndGenerateCEL(webhookFormData.cel);
  return {
    ...webhookFormData,
    status: 'enabled',
    metricName,
    condition,
  };
};

export const validateCel = (cel: { conditions: Condition[] }) => {
  if (cel.conditions.length !== 1) {
    return 'Must have exactly one CEL condition';
  }
  const hasInvalidCondition = cel.conditions.some(
    (cond) => !cond.field || !cond.operator || !cond.value,
  );
  if (hasInvalidCondition) {
    return 'Please complete all condition fields before saving.';
  }
};

const getValueType = (condition: Condition) => {
  const conditionConfig = conditionsConfig.find((it) => it.field === condition.field);
  if (!conditionConfig) {
    throw new Error('Could not find condition config');
  }
  return conditionConfig.inputType === 'number' || conditionConfig.inputType === 'boolean'
    ? 'valueNumber'
    : 'valueString';
};

export const formatAndGenerateCEL = (cel: { conditions: Condition[] }) => {
  const errorMessage = validateCel(cel);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  const condition = cel.conditions[0];
  const valueType = getValueType(condition);
  return {
    metricName: cel.conditions[0].field,
    condition: `${valueType} ${condition.operator} ${condition.value}`,
  };
};
