const numericValidation = {
  required: 'Value is required',
  validate: (val: string) => !isNaN(Number(val)),
};

const booleanValidation = {
  required: 'Value is required',
  validate: (value: string) => value === 'true' || value === 'false',
};

export const conditionsConfig = [
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
