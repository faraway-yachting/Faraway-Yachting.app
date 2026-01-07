/**
 * CSV Import Utilities for Bank Statements
 *
 * Handles parsing, validation, and transformation of CSV bank statements
 * into BankFeedLine records.
 */

import { BankFeedLine, BankFeedStatus } from '@/data/banking/bankReconciliationTypes';
import { Currency } from '@/data/company/types';

export interface CSVImportResult {
  success: boolean;
  data?: BankFeedLine[];
  errors?: string[];
  warnings?: string[];
  duplicates?: number;
  imported?: number;
}

export interface CSVMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  referenceColumn?: string;
  balanceColumn?: string;
}

/**
 * Parse CSV file and convert to BankFeedLine records
 */
export async function parseCSV(
  file: File,
  bankAccountId: string,
  companyId: string,
  currency: Currency,
  mapping?: CSVMapping
): Promise<CSVImportResult> {
  try {
    // Read file content
    const content = await file.text();

    // Parse CSV
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return {
        success: false,
        errors: ['CSV file is empty or contains only headers'],
      };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);

    // Auto-detect mapping if not provided
    const columnMapping = mapping || detectCSVMapping(headers);

    // Validate mapping
    const mappingErrors = validateMapping(columnMapping, headers);
    if (mappingErrors.length > 0) {
      return {
        success: false,
        errors: mappingErrors,
      };
    }

    // Parse data rows
    const bankLines: BankFeedLine[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const cells = parseCSVLine(lines[i]);

      if (cells.length === 0 || cells.every(c => !c.trim())) {
        continue; // Skip empty rows
      }

      try {
        const bankLine = parseRow(
          cells,
          headers,
          columnMapping,
          bankAccountId,
          companyId,
          currency,
          rowNum
        );

        // Validate the parsed line
        const validationErrors = validateBankLine(bankLine);
        if (validationErrors.length > 0) {
          errors.push(`Row ${rowNum}: ${validationErrors.join(', ')}`);
          continue;
        }

        bankLines.push(bankLine);
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    // Check for duplicates (basic check by date + amount + description)
    // TODO: In production, check against existing database records
    const duplicates = findDuplicates(bankLines);
    if (duplicates > 0) {
      warnings.push(`Found ${duplicates} potential duplicate transactions`);
    }

    if (bankLines.length === 0) {
      return {
        success: false,
        errors: errors.length > 0 ? errors : ['No valid transactions found in CSV'],
      };
    }

    return {
      success: true,
      data: bankLines,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      duplicates,
      imported: bankLines.length,
    };

  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to parse CSV file'],
    };
  }
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse a single row into a BankFeedLine
 */
function parseRow(
  cells: string[],
  headers: string[],
  mapping: CSVMapping,
  bankAccountId: string,
  companyId: string,
  currency: Currency,
  rowNum: number
): BankFeedLine {
  const getCell = (columnName: string): string => {
    const index = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
    return index >= 0 ? cells[index] : '';
  };

  // Parse date
  const dateStr = getCell(mapping.dateColumn);
  const transactionDate = parseDate(dateStr);
  if (!transactionDate) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // Parse amount
  let amount = 0;
  if (mapping.amountColumn) {
    amount = parseAmount(getCell(mapping.amountColumn));
  } else if (mapping.debitColumn && mapping.creditColumn) {
    const debit = parseAmount(getCell(mapping.debitColumn));
    const credit = parseAmount(getCell(mapping.creditColumn));
    amount = credit - debit; // Credit is positive, debit is negative
  } else {
    throw new Error('No amount column found');
  }

  // Parse other fields
  const description = getCell(mapping.descriptionColumn);
  const reference = mapping.referenceColumn ? getCell(mapping.referenceColumn) : undefined;
  const runningBalance = mapping.balanceColumn ? parseAmount(getCell(mapping.balanceColumn)) : undefined;

  // Create BankFeedLine
  const now = new Date().toISOString();
  const bankLine: BankFeedLine = {
    id: `import-${bankAccountId}-${Date.now()}-${rowNum}`,
    bankAccountId,
    companyId,
    currency,
    transactionDate,
    valueDate: transactionDate, // Assume same as transaction date
    description,
    reference,
    amount,
    runningBalance,
    status: 'unmatched' as BankFeedStatus,
    matchedAmount: 0,
    matches: [],
    importedAt: now,
    importedBy: 'current-user', // TODO: Get from auth context
    importSource: 'csv',
  };

  return bankLine;
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try various date formats
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // MM/DD/YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
  ];

  // Try YYYY-MM-DD first (ISO format)
  const isoMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD/MM/YYYY (common in Thailand, Europe)
  const ddmmMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmMatch) {
    const [, day, month, year] = ddmmMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[^\d.,-]/g, '');

  // Handle different decimal separators
  // If there's a comma after the last period, assume comma is decimal separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma - could be thousands separator or decimal
    // If exactly 3 digits after comma, it's thousands separator
    if (/,\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Detect CSV column mapping automatically
 */
export function detectCSVMapping(headers: string[]): CSVMapping {
  const lowerHeaders = headers.map(h => h.toLowerCase());

  const mapping: CSVMapping = {
    dateColumn: '',
    descriptionColumn: '',
  };

  // Detect date column
  const dateKeywords = ['date', 'transaction date', 'value date', 'posting date'];
  mapping.dateColumn = headers[lowerHeaders.findIndex(h =>
    dateKeywords.some(kw => h.includes(kw))
  )] || headers[0];

  // Detect description column
  const descKeywords = ['description', 'details', 'narrative', 'memo', 'particulars'];
  mapping.descriptionColumn = headers[lowerHeaders.findIndex(h =>
    descKeywords.some(kw => h.includes(kw))
  )] || headers[1];

  // Detect amount columns
  const amountIndex = lowerHeaders.findIndex(h => h === 'amount' || h === 'value');
  const debitIndex = lowerHeaders.findIndex(h => h.includes('debit') || h === 'dr');
  const creditIndex = lowerHeaders.findIndex(h => h.includes('credit') || h === 'cr');

  if (amountIndex >= 0) {
    mapping.amountColumn = headers[amountIndex];
  } else if (debitIndex >= 0 && creditIndex >= 0) {
    mapping.debitColumn = headers[debitIndex];
    mapping.creditColumn = headers[creditIndex];
  }

  // Detect reference column
  const refIndex = lowerHeaders.findIndex(h =>
    h.includes('reference') || h.includes('ref') || h === 'cheque no' || h === 'transaction id'
  );
  if (refIndex >= 0) {
    mapping.referenceColumn = headers[refIndex];
  }

  // Detect balance column
  const balanceIndex = lowerHeaders.findIndex(h => h.includes('balance') || h === 'running balance');
  if (balanceIndex >= 0) {
    mapping.balanceColumn = headers[balanceIndex];
  }

  return mapping;
}

/**
 * Validate column mapping
 */
function validateMapping(mapping: CSVMapping, headers: string[]): string[] {
  const errors: string[] = [];

  if (!mapping.dateColumn || !headers.includes(mapping.dateColumn)) {
    errors.push('Date column not found or not mapped');
  }

  if (!mapping.descriptionColumn || !headers.includes(mapping.descriptionColumn)) {
    errors.push('Description column not found or not mapped');
  }

  const hasAmountColumn = mapping.amountColumn && headers.includes(mapping.amountColumn);
  const hasDebitCredit =
    mapping.debitColumn && headers.includes(mapping.debitColumn) &&
    mapping.creditColumn && headers.includes(mapping.creditColumn);

  if (!hasAmountColumn && !hasDebitCredit) {
    errors.push('Amount column(s) not found. Need either Amount column or Debit/Credit columns');
  }

  return errors;
}

/**
 * Validate BankFeedLine data
 */
export function validateBankLine(line: Partial<BankFeedLine>): string[] {
  const errors: string[] = [];

  if (!line.transactionDate) {
    errors.push('Transaction date is required');
  }

  if (!line.description || line.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (line.amount === undefined || line.amount === null) {
    errors.push('Amount is required');
  }

  if (!line.currency) {
    errors.push('Currency is required');
  }

  return errors;
}

/**
 * Find duplicate transactions within the import
 */
function findDuplicates(lines: BankFeedLine[]): number {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const line of lines) {
    // Create a key based on date, amount, and description
    const key = `${line.transactionDate}|${line.amount}|${line.description.substring(0, 50)}`;
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

/**
 * Check for duplicates against existing bank lines
 */
export function checkDuplicates(
  newLines: BankFeedLine[],
  existingLines: BankFeedLine[]
): BankFeedLine[] {
  const existingKeys = new Set(
    existingLines.map(line =>
      `${line.transactionDate}|${line.amount}|${line.description.substring(0, 50)}`
    )
  );

  return newLines.filter(line => {
    const key = `${line.transactionDate}|${line.amount}|${line.description.substring(0, 50)}`;
    return existingKeys.has(key);
  });
}
