import {
  Condition,
  Webhook,
  WebhookCreateInput,
  WebhookFormInput,
} from '@/types/webhook';
import { RegisterOptions } from 'react-hook-form';
import { LocalizedError } from '@/utils/localizedError';

export const extractCELFromWebhook = (webhook: Webhook): WebhookFormInput['cel'] => {
  const { metricName, condition } = webhook;

  if (isEventService(webhook.service)) {
    return {
      conditions: [{ field: metricName, operator: '', value: '' }],
      operator: 'AND',
    };
  }

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
  labelKey: string;
  inputType: InputType;
  validation: RegisterOptions;
}

// `required` holds a common message key, not text: nothing renders these rule
// messages today, and anything that does must translate it.
const numericValidation: RegisterOptions = {
  required: 'webhooks.validation.valueRequired',
  validate: (val: string) => !isNaN(Number(val)),
};

const booleanValidation: RegisterOptions = {
  required: 'webhooks.validation.valueRequired',
  validate: (value: string) => {
    const parsedValue = Number(value);
    return parsedValue === 1 || parsedValue === 0;
  },
};

export const eventNamesByService: Record<string, { value: string; labelKey: string }[]> =
  {
    events: [
      { value: 'behavior.harshBraking', labelKey: 'webhooks.events.harshBraking' },
      { value: 'behavior.extremeBraking', labelKey: 'webhooks.events.extremeBraking' },
      {
        value: 'behavior.harshAcceleration',
        labelKey: 'webhooks.events.harshAcceleration',
      },
      { value: 'behavior.harshCornering', labelKey: 'webhooks.events.harshCornering' },
      { value: 'safety.collision', labelKey: 'webhooks.events.collision' },
    ],
  };

export const isEventService = (service: string): boolean => service === 'events';

export const conditionsConfig: ConditionConfig[] = [
  {
    field: 'vss.speed',
    labelKey: 'webhooks.conditions.speed',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.obdIsPluggedIn',
    labelKey: 'webhooks.conditions.obdIsPluggedIn',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'vss.isIgnitionOn',
    labelKey: 'webhooks.conditions.isIgnitionOn',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'vss.powertrainTractionBatteryCurrentPower',
    labelKey: 'webhooks.conditions.batteryCurrentPower',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.powertrainTractionBatteryChargingIsCharging',
    labelKey: 'webhooks.conditions.batteryIsCharging',
    inputType: 'boolean',
    validation: booleanValidation,
  },
  {
    field: 'vss.powertrainTransmissionTravelledDistance',
    labelKey: 'webhooks.conditions.odometer',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.powertrainTractionBatteryStateOfChargeCurrent',
    labelKey: 'webhooks.conditions.chargeLevel',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.powertrainFuelSystemRelativeLevel',
    labelKey: 'webhooks.conditions.fuelRelative',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.powertrainFuelSystemAbsoluteLevel',
    labelKey: 'webhooks.conditions.fuelAbsolute',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.chassisAxleRow1WheelLeftTirePressure',
    labelKey: 'webhooks.conditions.tireFrontLeft',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.chassisAxleRow1WheelRightTirePressure',
    labelKey: 'webhooks.conditions.tireFrontRight',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.chassisAxleRow2WheelLeftTirePressure',
    labelKey: 'webhooks.conditions.tireBackLeft',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.chassisAxleRow2WheelRightTirePressure',
    labelKey: 'webhooks.conditions.tireBackRight',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.powertrainCombustionEngineSpeed',
    labelKey: 'webhooks.conditions.engineSpeed',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'vss.obdThrottlePosition',
    labelKey: 'webhooks.conditions.throttlePosition',
    inputType: 'number',
    validation: numericValidation,
  },
];

export const formatWebhookFormData = (
  webhookFormData: WebhookFormInput,
): WebhookCreateInput => {
  if (isEventService(webhookFormData.service)) {
    const metricName = webhookFormData.cel.conditions[0]?.field;
    if (!metricName) {
      throw new LocalizedError(
        'webhooks.validation.selectEvent',
        'Please select an event name',
      );
    }
    return {
      ...webhookFormData,
      status: 'enabled',
      metricName,
      condition: 'true',
    };
  }
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
    return new LocalizedError(
      'webhooks.validation.oneCondition',
      'Must have exactly one CEL condition',
    );
  }
  const hasInvalidCondition = cel.conditions.some(
    (cond) => !cond.field || !cond.operator || !cond.value,
  );
  if (hasInvalidCondition) {
    return new LocalizedError(
      'webhooks.validation.completeConditions',
      'Please complete all condition fields before saving.',
    );
  }
};

const getValueType = (condition: Condition) => {
  const conditionConfig = conditionsConfig.find((it) => it.field === condition.field);
  // A metric outside the list has no declared type: go by what was typed.
  if (!conditionConfig) {
    return Number.isNaN(Number(condition.value)) ? 'valueString' : 'valueNumber';
  }
  return conditionConfig.inputType === 'number' || conditionConfig.inputType === 'boolean'
    ? 'valueNumber'
    : 'valueString';
};

export const formatAndGenerateCEL = (cel: { conditions: Condition[] }) => {
  const error = validateCel(cel);
  if (error) {
    throw error;
  }
  const condition = cel.conditions[0];
  const valueType = getValueType(condition);
  return {
    metricName: cel.conditions[0].field,
    condition: `${valueType} ${condition.operator} ${condition.value}`,
  };
};
