import { formatAndGenerateCEL } from '@/utils/webhook';

describe('formatAndGenerateCEL', () => {
  it('should format a valid number condition correctly', () => {
    const cel = {
      conditions: [
        {
          field: 'vss.speed',
          operator: '>',
          value: '50',
        },
      ],
    };
    const result = formatAndGenerateCEL(cel);
    expect(result).toEqual({
      metricName: 'vss.speed',
      condition: 'valueNumber > 50',
    });
  });

  it('should format a valid boolean condition correctly', () => {
    const cel = {
      conditions: [
        {
          field: 'vss.isIgnitionOn',
          operator: '==',
          value: '1',
        },
      ],
    };
    const result = formatAndGenerateCEL(cel);
    expect(result).toEqual({
      metricName: 'vss.isIgnitionOn',
      condition: 'valueNumber == 1',
    });
  });

  it('should throw if there are multiple conditions', () => {
    const cel = {
      conditions: [
        { field: 'vss.speed', operator: '>', value: '50' },
        { field: 'vss.isIgnitionOn', operator: '==', value: '1' },
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
      conditions: [{ field: 'vss.speed', operator: '', value: '50' }],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow(
      'Please complete all condition fields before saving.',
    );
  });

  it('should throw if a condition is missing a value', () => {
    const cel = {
      conditions: [{ field: 'vss.speed', operator: '>', value: '' }],
    };
    expect(() => formatAndGenerateCEL(cel)).toThrow(
      'Please complete all condition fields before saving.',
    );
  });

  it('saves a metric outside the list with a numeric value', () => {
    const cel = {
      conditions: [{ field: 'somethingNew', operator: '>', value: '5' }],
    };
    expect(formatAndGenerateCEL(cel)).toEqual({
      metricName: 'somethingNew',
      condition: 'valueNumber > 5',
    });
  });

  it('saves a metric outside the list with a text value', () => {
    const cel = {
      conditions: [{ field: 'somethingNew', operator: '==', value: 'abc' }],
    };
    const result = formatAndGenerateCEL(cel);
    expect(result.metricName).toBe('somethingNew');
    expect(result.condition).toMatch(/^valueString == /);
  });

  it('keeps the type of a listed metric', () => {
    // A listed numeric metric stays numeric even when its value is not a number.
    const speed = { conditions: [{ field: 'vss.speed', operator: '>', value: 'abc' }] };
    expect(formatAndGenerateCEL(speed).condition).toBe('valueNumber > abc');
    const ignition = {
      conditions: [{ field: 'vss.isIgnitionOn', operator: '==', value: '1' }],
    };
    expect(formatAndGenerateCEL(ignition).condition).toBe('valueNumber == 1');
  });
});
