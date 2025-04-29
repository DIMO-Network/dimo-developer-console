// Dynamic condition config
export const conditionConfig = [
  {
    field: 'isIgnitionOn',
    label: 'Is Ignition On',
    inputType: 'boolean',
    validation: {
      required: 'Value is required',
    },
  },
  {
    field: 'odometer',
    label: 'Odometer',
    inputType: 'number',
    validation: {
      required: 'Value is required',
      validate: (value: string) => !isNaN(Number(value)) || 'Value must be a number',
    },
  },
  {
    field: 'speed',
    label: 'Speed',
    inputType: 'number',
    validation: {
      required: 'Value is required',
      validate: (value: string) => !isNaN(Number(value)) || 'Value must be a number',
    },
  },
  {
    field: 'engine_on',
    label: 'Engine On',
    inputType: 'boolean',
    validation: {
      required: 'Value is required',
    },
  },
];
