/**
 * Document Number Format Configuration Data Store
 *
 * Manages customizable number formats per company and document type.
 * Falls back to defaults if no custom format is configured.
 */

import {
  DocumentType,
  NumberFormatConfig,
  CompanyNumberFormats,
  defaultPrefixes,
} from './numberFormatTypes';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default number format configuration
 * Format: PREFIX-YYMMXXXX (e.g., INV-26010001)
 */
export const defaultNumberFormat: NumberFormatConfig = {
  prefix: '', // Will be set per document type
  dateFormat: 'YYMM',
  sequenceDigits: 4,
  separator: '-',
};

/**
 * Get the default format for a specific document type
 */
export function getDefaultFormat(docType: DocumentType): NumberFormatConfig {
  return {
    ...defaultNumberFormat,
    prefix: defaultPrefixes[docType],
  };
}

// ============================================================================
// In-Memory Storage (Replace with database in production)
// ============================================================================

// Store company-specific format overrides
let companyFormats: CompanyNumberFormats[] = [];

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get the number format configuration for a company and document type.
 * Returns custom format if exists, otherwise returns default.
 */
export function getNumberFormat(
  companyId: string,
  docType: DocumentType
): NumberFormatConfig {
  const companyConfig = companyFormats.find(cf => cf.companyId === companyId);

  if (companyConfig?.formats[docType]) {
    return companyConfig.formats[docType]!;
  }

  return getDefaultFormat(docType);
}

/**
 * Get all number formats for a company (with defaults for unconfigured types)
 */
export function getAllNumberFormats(
  companyId: string
): Record<DocumentType, NumberFormatConfig> {
  const docTypes: DocumentType[] = ['quotation', 'invoice', 'receipt', 'creditNote', 'debitNote'];
  const result: Record<DocumentType, NumberFormatConfig> = {} as Record<DocumentType, NumberFormatConfig>;

  for (const docType of docTypes) {
    result[docType] = getNumberFormat(companyId, docType);
  }

  return result;
}

/**
 * Update the number format for a specific company and document type
 */
export function updateNumberFormat(
  companyId: string,
  docType: DocumentType,
  config: NumberFormatConfig
): void {
  let companyConfig = companyFormats.find(cf => cf.companyId === companyId);

  if (!companyConfig) {
    companyConfig = {
      companyId,
      formats: {},
      updatedAt: new Date().toISOString(),
    };
    companyFormats.push(companyConfig);
  }

  companyConfig.formats[docType] = config;
  companyConfig.updatedAt = new Date().toISOString();
}

/**
 * Reset a document type format to default for a company
 */
export function resetNumberFormat(
  companyId: string,
  docType: DocumentType
): void {
  const companyConfig = companyFormats.find(cf => cf.companyId === companyId);

  if (companyConfig?.formats[docType]) {
    delete companyConfig.formats[docType];
    companyConfig.updatedAt = new Date().toISOString();
  }
}

/**
 * Reset all formats to default for a company
 */
export function resetAllNumberFormats(companyId: string): void {
  const index = companyFormats.findIndex(cf => cf.companyId === companyId);
  if (index !== -1) {
    companyFormats.splice(index, 1);
  }
}

/**
 * Check if a company has custom format for a document type
 */
export function hasCustomFormat(
  companyId: string,
  docType: DocumentType
): boolean {
  const companyConfig = companyFormats.find(cf => cf.companyId === companyId);
  return !!companyConfig?.formats[docType];
}

// ============================================================================
// Number Generation
// ============================================================================

/**
 * Generate a document number based on configuration
 */
export function generateDocumentNumber(
  config: NumberFormatConfig,
  sequenceNumber: number
): string {
  const parts: string[] = [];

  // Add prefix
  if (config.prefix) {
    parts.push(config.prefix);
  }

  // Add date portion
  if (config.dateFormat !== 'none') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let datePart = '';
    switch (config.dateFormat) {
      case 'YYMM':
        datePart = `${String(year).slice(-2)}${String(month).padStart(2, '0')}`;
        break;
      case 'YYYYMM':
        datePart = `${year}${String(month).padStart(2, '0')}`;
        break;
      case 'MMYY':
        datePart = `${String(month).padStart(2, '0')}${String(year).slice(-2)}`;
        break;
    }
    parts.push(datePart);
  }

  // Add sequence number
  const sequence = String(sequenceNumber).padStart(config.sequenceDigits, '0');
  parts.push(sequence);

  return parts.join(config.separator);
}

/**
 * Generate a preview number for display in settings
 */
export function generatePreviewNumber(config: NumberFormatConfig): string {
  return generateDocumentNumber(config, 1);
}

/**
 * Format a configuration as a pattern string for display
 * e.g., "INV-YYMMXXXX"
 */
export function formatConfigAsPattern(config: NumberFormatConfig): string {
  const parts: string[] = [];

  if (config.prefix) {
    parts.push(config.prefix);
  }

  if (config.dateFormat !== 'none') {
    parts.push(config.dateFormat);
  }

  parts.push('X'.repeat(config.sequenceDigits));

  return parts.join(config.separator);
}
