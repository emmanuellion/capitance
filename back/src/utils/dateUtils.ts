/**
 * Extract date from Boursobank filename
 * Pattern: export-positions-instantanees-DD-MM-YYYY_HH-MM-SS.csv
 * Example: export-positions-instantanees-07-01-2026_15-29-21.csv
 */
export function extractDateFromFilename(filename: string): Date | null {
  // Pattern for Boursobank snapshot files
  const boursobankPattern = /export-positions-instantanees-(\d{2})-(\d{2})-(\d{4})_(\d{2})-(\d{2})-(\d{2})/;
  const match = filename.match(boursobankPattern);

  if (match) {
    const [, day, month, year, hours, minutes, seconds] = match;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );

    // Validate the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Parse French date format: DD/MM/YYYY
 */
export function parseFrenchDate(dateStr: string): Date {
  if (!dateStr) throw new Error('Date manquante');

  const [day, month, year] = dateStr.split('/').map(Number);

  if (!day || !month || !year) {
    throw new Error(`Format de date invalide: ${dateStr}`);
  }

  return new Date(year, month - 1, day);
}

/**
 * Parse ISO date string or return current date
 */
export function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

/**
 * Get snapshot date with fallback strategy
 * 1. Use provided date
 * 2. Extract from filename
 * 3. Use current date
 */
export function getSnapshotDate(
  providedDate: Date | string | undefined,
  filename: string
): Date {
  // 1. Use provided date if valid
  if (providedDate) {
    const date = typeof providedDate === 'string' ? parseDate(providedDate) : providedDate;
    if (date && !isNaN(date.getTime())) {
      return date;
    }
  }

  // 2. Try to extract from filename
  const extractedDate = extractDateFromFilename(filename);
  if (extractedDate) {
    return extractedDate;
  }

  // 3. Fallback to current date
  return new Date();
}
