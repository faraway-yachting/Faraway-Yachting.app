/**
 * PDF Settings Types
 *
 * Configuration for PDF document display fields and terms templates.
 */

export type DocumentType = 'quotation' | 'invoice' | 'receipt';

/**
 * Settings for which fields to display in PDF output
 */
export interface PdfFieldSettings {
  // Header fields (Company info)
  showCompanyAddress: boolean;
  showCompanyPhone: boolean;
  showCompanyEmail: boolean;
  showCompanyTaxId: boolean;

  // Client fields
  showClientAddress: boolean;
  showClientEmail: boolean;
  showClientTaxId: boolean;

  // Document fields
  showValidUntil: boolean;

  // Line item columns (only applicable when VAT/WHT exists)
  showVatColumn: boolean;
  showWhtColumn: boolean;

  // Summary fields
  showSubtotal: boolean;
  showVatAmount: boolean;
  showWhtAmount: boolean;
  showNetAmountToPay: boolean;

  // Additional sections
  showPaymentDetails: boolean;
  showTermsAndConditions: boolean;
  showCreatedBySignature: boolean;
}

/**
 * Document-specific settings including field visibility and default terms
 */
export interface DocumentPdfSettings {
  fields: PdfFieldSettings;
  defaultTermsAndConditions: string;
  defaultValidityDays?: number; // Only applicable for quotation and invoice
}

/**
 * Complete PDF settings for all document types
 */
export interface PdfSettings {
  quotation: DocumentPdfSettings;
  invoice: DocumentPdfSettings;
  receipt: DocumentPdfSettings;
}
