const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export const formatMoney = (val: number): string => {
  return currencyFormatter.format(val);
};

const formatUnits = (abs: number, divisor: number, unit: string, sign: string): string => {
  const n = abs / divisor;
  const formatted = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '');
  return `${sign}$${formatted}${unit}`;
};

export const formatCompact = (val: number): string => {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) return formatUnits(abs, 1_000_000_000_000, 'T', sign);
  if (abs >= 1_000_000_000) return formatUnits(abs, 1_000_000_000, 'B', sign);
  if (abs >= 1_000_000) return formatUnits(abs, 1_000_000, 'M', sign);
  if (abs >= 1_000) return formatUnits(abs, 1_000, 'K', sign);
  return `${sign}$${abs.toFixed(0)}`;
};
