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
  const item = lookup.findLast((item) => value >= item.value);

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

export const formatSimpleBalanceWithDigits = (
  value: number,
  digits: number,
): string => {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
};
