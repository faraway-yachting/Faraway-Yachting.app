/**
 * Document Number Format Configuration Types
 */

export type DocumentType = 'quotation' | 'invoice' | 'receipt' | 'creditNote' | 'debitNote' | 'whtCertificate';

export type DateFormat = 'YYMM' | 'YYYYMM' | 'MMYY' | 'none';

export type Separator = '-' | '/' | '';

export interface NumberFormatConfig {
  prefix: string;           // e.g., "INV", "FYT-INV"
  dateFormat: DateFormat;   // How to format the date portion
  sequenceDigits: number;   // 4 = 0001, 5 = 00001, 6 = 000001
  separator: Separator;     // Character between prefix, date, and sequence
}

export interface CompanyNumberFormats {
  companyId: string;
  formats: Partial<Record<DocumentType, NumberFormatConfig>>;
  updatedAt: string;
}

// Document type display names for UI
export const documentTypeLabels: Record<DocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  receipt: 'Receipt',
  creditNote: 'Credit Note',
  debitNote: 'Debit Note',
  whtCertificate: 'WHT Certificate',
};

// Default prefixes for each document type
export const defaultPrefixes: Record<DocumentType, string> = {
  quotation: 'QO',
  invoice: 'INV',
  receipt: 'RE',
  creditNote: 'CN',
  debitNote: 'DN',
  whtCertificate: 'WHT',
};
