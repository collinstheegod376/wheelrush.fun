export const formatMoney = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

export const formatCompact = (val: number): string => {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) {
    const t = abs / 1_000_000_000_000;
    return `${sign}$${t % 1 === 0 ? t.toFixed(0) : t.toFixed(1).replace(/\.0$/, '')}T`;
  } else if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    return `${sign}$${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1).replace(/\.0$/, '')}B`;
  } else if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '')}M`;
  } else if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
};
