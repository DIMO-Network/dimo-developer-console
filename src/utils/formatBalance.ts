// en-US on purpose: useSACD writes this into the SACD agreement, not the UI.
// Screens format numbers with next-intl's useFormatter.
export const formatSimpleBalanceWithDigits = (value: number, digits: number): string => {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};
