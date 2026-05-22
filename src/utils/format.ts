export const formatRSD = (iznos: number): string =>
  new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    minimumFractionDigits: 2,
  }).format(iznos);

export const formatDatum = (datum: string): string => {
  if (!datum) return '-';
  return new Date(datum).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const genId = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const danas = (): string => new Date().toISOString().split('T')[0];

export const godineFaktura = (fakture: { datum: string }[]): number[] => {
  const skup = new Set(fakture.map(f => new Date(f.datum).getFullYear()));
  return Array.from(skup).sort((a, b) => b - a);
};
