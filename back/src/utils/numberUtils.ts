/**
 * Parse French number format to JavaScript number
 * Handles formats like:
 * - "123,45" → 123.45
 * - "1 142,57" → 1142.57
 * - "87,15 €" → 87.15
 * - "-123,45" → -123.45
 */
export function parseFrenchNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  // Remove spaces, currency symbols, and other non-numeric characters
  const cleaned = value
    .toString()
    .replace(/\s/g, '') // Remove all spaces
    .replace(/€/g, '') // Remove euro symbol
    .replace(/,/, '.'); // Replace comma with dot for decimal

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse French currency format
 * Example: "87,15 €" → 87.15
 */
export function parseFrenchCurrency(value: string | undefined | null): number {
  return parseFrenchNumber(value);
}

/**
 * Parse percentage value
 * Example: "7,75" → 7.75 or "7,75%" → 7.75
 */
export function parsePercentage(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const cleaned = value.toString().replace(/%/g, '').trim();
  return parseFrenchNumber(cleaned);
}

/**
 * Parse German number format to JavaScript number
 * Handles formats like:
 * - "123,45" → 123.45
 * - "1.142,57" → 1142.57
 * - "87,15 €" → 87.15
 * - "-123,45" → -123.45
 */
export function parseGermanNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  // Remove spaces, currency symbols, and other non-numeric characters
  const cleaned = value
    .toString()
    .replace(/\s/g, '') // Remove all spaces
    .replace(/€/g, '') // Remove euro symbol
    .replace(/\./g, '') // Remove thousand separators (dots)
    .replace(/,/, '.'); // Replace comma with dot for decimal

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
