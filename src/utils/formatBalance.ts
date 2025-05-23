const findLast = <T>(arr: T[], predicate: (value: T) => boolean): T | undefined => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return arr[i];
    }
  }
  return undefined;
};

const formatter = (value: number, digits: number): string => {
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
  const item = findLast(lookup, (item) => value >= item.value);

  return item
    ? (value / item.value).toFixed(digits).replace(regexp, '') + item.symbol
    : '0';
};

export const formatToHumanReadable = (value: number): string => {
  return formatToHumanReadableWithDigits(value, 2);
};

export const formatToHumanReadableWithDigits = (
  value: number,
  digits: number,
): string => {
  return formatter(value, digits);
};

export const formatSimpleBalance = (value: number): string => {
  return formatSimpleBalanceWithDigits(value, 2);
};

export const formatSimpleBalanceWithDigits = (value: number, digits: number): string => {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

export const formatToCurrency = (value: number): string => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};
