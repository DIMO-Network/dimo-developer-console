const numericValidation = {
  required: 'Value is required',
  validate: (value: string) => !isNaN(Number(value)) || 'Value must be a number',
};

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
    field: 'powertrainTractionBatteryCurrentPower',
    label: 'Battery current power',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryChargingIsCharging',
    label: 'Battery is charging',
    inputType: 'boolean',
    validation: {
      required: 'Value is required',
    },
  },
  {
    field: 'powertrainTransmissionTravelledDistance',
    label: 'Odometer',
    inputType: 'number',
    validation: numericValidation,
  },
  {
    field: 'fuel_level',
    label: 'Fuel Level',
    inputType: 'number',
    multiFields: [
      'powertrainFuelSystemRelativeLevel',
      'powertrainFuelSystemAbsoluteLevel',
    ],
    validation: numericValidation,
  },
  {
    field: 'powertrainTractionBatteryStateOfChargeCurrent',
    label: 'Charge level',
    inputType: 'number',
    validation: numericValidation,
  },
];
