import { formatEther, parseEther } from 'viem';

// DIMO and DCX amounts (18 decimals) to and from wei, exactly as web3's
// toWei(value, 'ether') and fromWei(wei, 'ether') did before viem replaced it.

// The decimal JavaScript prints for a number, without the exponent form:
// 1.2e-7 -> 0.00000012. viem's parseEther takes only plain decimals.
const plainDecimal = (amount: number | string): string => {
  const text = String(amount).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d*))?e([+-]?\d+)$/i.exec(text);
  if (!match) return text;
  const [, sign, whole, fraction = '', exponent] = match;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length)
    return `${sign}${digits}${'0'.repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
};

// Past the 18th decimal is less than a wei: dropped, as web3 did, not rounded
// as parseEther would.
const toWeiPrecision = (decimal: string): string => {
  const [whole, fraction] = decimal.split('.');
  return fraction === undefined ? whole : `${whole}.${fraction.slice(0, 18)}`;
};

export const toWei = (amount: number | string): bigint =>
  parseEther(toWeiPrecision(plainDecimal(amount)));

export const fromWei = (wei: bigint): number => Number(formatEther(wei));
