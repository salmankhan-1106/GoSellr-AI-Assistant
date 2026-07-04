// Trimmed from the host app's lib/utils.ts — just the one formatter the
// AI-assistant components need. Swap the locale/currency for your own.
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(price);
}
