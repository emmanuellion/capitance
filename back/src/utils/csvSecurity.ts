/**
 * CSV Security Utilities
 *
 * Provides protection against CSV injection attacks and validates CSV file structure
 */

export interface CSVValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    stats?: {
        lineCount: number;
        columnCount: number;
        estimatedSize: number;
    };
}

export interface CSVValidationOptions {
    maxLines?: number;
    maxColumns?: number;
    maxCellLength?: number;
    allowedDelimiters?: string[];
}

/**
 * CSV Injection characters that could execute formulas in spreadsheet applications
 */
const CSV_INJECTION_PATTERNS = [
    /^=/,      // Formula (Excel, Google Sheets)
    /^\+/,     // Formula addition
    /^-/,      // Formula subtraction
    /^@/,      // Formula (Excel)
    /^\t/,     // Tab (potential command injection)
    /^\r/,     // Carriage return
];

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: Required<CSVValidationOptions> = {
    maxLines: 10000,           // Maximum 10,000 rows
    maxColumns: 50,             // Maximum 50 columns
    maxCellLength: 1000,        // Maximum 1000 characters per cell
    allowedDelimiters: [',', ';', '\t'],
};

/**
 * Validates CSV file structure and content for security issues
 */
export function validateCSVStructure(
    fileContent: string,
    options: CSVValidationOptions = {}
): CSVValidationResult {
    const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Remove BOM if present
    const content = fileContent.replace(/^\uFEFF/, '');

    // Check if file is empty
    if (!content || content.trim().length === 0) {
        return {
            valid: false,
            errors: ['File is empty'],
            warnings,
        };
    }

    // Split into lines
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    // Validate line count
    if (lines.length === 0) {
        return {
            valid: false,
            errors: ['No valid lines found in file'],
            warnings,
        };
    }

    if (lines.length > opts.maxLines) {
        errors.push(`File exceeds maximum line count (${lines.length} > ${opts.maxLines})`);
    }

    // Detect delimiter from first line
    const firstLine = lines[0];
    const delimiter = detectDelimiter(firstLine, opts.allowedDelimiters);

    if (!delimiter) {
        errors.push('Could not detect valid CSV delimiter (expected: comma, semicolon, or tab)');
        return {
            valid: false,
            errors,
            warnings,
        };
    }

    // Validate column consistency
    const headerColumns = firstLine.split(delimiter);
    const columnCount = headerColumns.length;

    if (columnCount > opts.maxColumns) {
        errors.push(`File exceeds maximum column count (${columnCount} > ${opts.maxColumns})`);
    }

    // Check for empty headers
    const emptyHeaders = headerColumns.filter(h => !h.trim());
    if (emptyHeaders.length > 0) {
        warnings.push(`${emptyHeaders.length} empty column header(s) found`);
    }

    // Validate each data row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cells = line.split(delimiter);

        // Check column count consistency
        if (cells.length !== columnCount) {
            warnings.push(`Line ${i + 1}: Column count mismatch (expected ${columnCount}, got ${cells.length})`);
        }

        // Validate cell content
        for (let j = 0; j < cells.length; j++) {
            const cell = cells[j];

            // Check cell length
            if (cell.length > opts.maxCellLength) {
                warnings.push(`Line ${i + 1}, Column ${j + 1}: Cell exceeds maximum length (${cell.length} > ${opts.maxCellLength})`);
            }

            // Check for CSV injection patterns
            const trimmedCell = cell.trim();
            if (trimmedCell.length > 0 && isCsvInjectionAttempt(trimmedCell)) {
                errors.push(`Line ${i + 1}, Column ${j + 1}: Potential CSV injection detected (cell starts with dangerous character: '${trimmedCell[0]}')`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats: {
            lineCount: lines.length,
            columnCount,
            estimatedSize: content.length,
        },
    };
}

/**
 * Detects the delimiter used in a CSV line
 */
function detectDelimiter(line: string, allowedDelimiters: string[]): string | null {
    let maxCount = 0;
    let detectedDelimiter: string | null = null;

    for (const delimiter of allowedDelimiters) {
        const count = line.split(delimiter).length - 1;
        if (count > maxCount) {
            maxCount = count;
            detectedDelimiter = delimiter;
        }
    }

    // Must have at least one delimiter
    return maxCount > 0 ? detectedDelimiter : null;
}

/**
 * Checks if a cell value contains CSV injection patterns
 */
function isCsvInjectionAttempt(cellValue: string): boolean {
    return CSV_INJECTION_PATTERNS.some(pattern => pattern.test(cellValue));
}

/**
 * Sanitizes a cell value to prevent CSV injection
 * Prepends a single quote to cells that start with dangerous characters
 */
export function sanitizeCsvCell(cellValue: string | null | undefined): string {
    if (cellValue === null || cellValue === undefined) {
        return '';
    }

    const value = cellValue.toString().trim();

    // Empty values are safe
    if (value.length === 0) {
        return value;
    }

    // If starts with dangerous character, prepend single quote
    if (isCsvInjectionAttempt(value)) {
        return `'${value}`;
    }

    return value;
}

/**
 * Sanitizes all string fields in an object to prevent CSV injection
 */
export function sanitizeCsvObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
        const value = sanitized[key];

        if (typeof value === 'string') {
            sanitized[key] = sanitizeCsvCell(value) as any;
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeCsvObject(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'string' ? sanitizeCsvCell(item) :
                item && typeof item === 'object' ? sanitizeCsvObject(item) :
                item
            ) as any;
        }
    }

    return sanitized;
}

/**
 * Validates file size before processing
 */
export function validateFileSize(fileSize: number, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
    return fileSize > 0 && fileSize <= maxSizeBytes;
}

/**
 * Validates MIME type for CSV files
 */
export function validateCsvMimeType(mimetype: string): boolean {
    const validMimeTypes = [
        'text/csv',
        'text/plain',
        'application/csv',
        'application/vnd.ms-excel', // Some systems report CSV as Excel
    ];

    return validMimeTypes.includes(mimetype.toLowerCase());
}

/**
 * Validates file extension
 */
export function validateCsvExtension(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'csv';
}
