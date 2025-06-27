import { formatAndGenerateCEL } from '@/utils/webhook';

describe('formatAndGenerateCEL', () => {
  it('should format a valid number condition correctly', () => {
    const cel = {
      conditions: [
        {
          field: 'speed',
          operator: '>',
          value: '50',
        },
      ],
    };
    const result = formatAndGenerateCEL(cel);
    expect(result).toEqual({
      data: 'speed',
      trigger: 'valueNumber > 50',
    });
  });

  it('should format a valid boolean condition correctly', () => {
    const cel = {
      conditions: [
        {
          field: 'isIgnitionOn',
          operator: '==',
          value: '1',
        },
      ],
    };
    const result = formatAndGenerateCEL(cel);
    expect(result).toEqual({
      data: 'isIgnitionOn',
      trigger: 'valueNumber == 1',
    });
  });

  it('should throw if there are multiple conditions', () => {
    const cel = {
      conditions: [
        { field: 'speed', operator: '>', value: '50' },
        { field: 'isIgnitionOn', operator: '==', value: '1' },
      ],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow(
      'Must have exactly one CEL condition',
    );
  });

  it('should throw if a condition is missing a field', () => {
    const cel = {
      conditions: [{ field: '', operator: '>', value: '50' }],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow(
      'Please complete all condition fields before saving.',
    );
  });

  it('should throw if a condition is missing an operator', () => {
    const cel = {
      conditions: [{ field: 'speed', operator: '', value: '50' }],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow(
      'Please complete all condition fields before saving.',
    );
  });

  it('should throw if a condition is missing a value', () => {
    const cel = {
      conditions: [{ field: 'speed', operator: '>', value: '' }],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow(
      'Please complete all condition fields before saving.',
    );
  });

  it('should throw if the field is not in conditionsConfig', () => {
    const cel = {
      conditions: [{ field: 'unknownField', operator: '==', value: '1' }],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow('Could not find condition config');
  });
});
