/**
 * PDF Settings Data and Operations
 *
 * Manages PDF display settings and default terms for each document type.
 * In production, this will be replaced with database queries.
 */

import type { PdfSettings, PdfFieldSettings, DocumentPdfSettings, DocumentType } from './types';

// Default field settings - all fields visible by default
const defaultFieldSettings: PdfFieldSettings = {
  // Header fields
  showCompanyAddress: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showCompanyTaxId: true,

  // Client fields
  showClientAddress: true,
  showClientEmail: true,
  showClientTaxId: false, // Hidden by default

  // Document fields
  showValidUntil: true,

  // Line item columns
  showVatColumn: true,
  showWhtColumn: true,

  // Summary fields
  showSubtotal: true,
  showVatAmount: true,
  showWhtAmount: true,
  showNetAmountToPay: true,

  // Additional sections
  showPaymentDetails: true,
  showTermsAndConditions: true,
  showCreatedBySignature: true,
};

// Default terms and conditions for each document type
const defaultQuotationTerms = `Payment Terms:
- 50% deposit required upon acceptance
- Balance due before charter commencement
- All prices are subject to applicable taxes

Cancellation Policy:
- Cancellations made 30+ days before charter: Full refund minus 10% admin fee
- Cancellations made 14-29 days before charter: 50% refund
- Cancellations made less than 14 days before charter: No refund`;

const defaultInvoiceTerms = `Payment Terms:
- Payment is due within the specified due date
- Late payments may incur interest charges
- All prices include applicable taxes as shown

Bank Transfer Instructions:
- Please include invoice number as payment reference
- Bank details are provided above`;

const defaultReceiptTerms = `This receipt confirms payment received.
- Keep this receipt for your records
- Contact us if you have any questions about this payment`;

// Current PDF settings (in-memory storage)
let pdfSettings: PdfSettings = {
  quotation: {
    fields: { ...defaultFieldSettings },
    defaultTermsAndConditions: defaultQuotationTerms,
    defaultValidityDays: 2,
  },
  invoice: {
    fields: { ...defaultFieldSettings },
    defaultTermsAndConditions: defaultInvoiceTerms,
    defaultValidityDays: 30,
  },
  receipt: {
    fields: { ...defaultFieldSettings },
    defaultTermsAndConditions: defaultReceiptTerms,
  },
};

// ============= Read Operations =============

/**
 * Get all PDF settings
 */
export function getPdfSettings(): PdfSettings {
  return pdfSettings;
}

/**
 * Get settings for a specific document type
 */
export function getDocumentPdfSettings(documentType: DocumentType): DocumentPdfSettings {
  return pdfSettings[documentType];
}

/**
 * Get field settings for a specific document type
 */
export function getDocumentFieldSettings(documentType: DocumentType): PdfFieldSettings {
  return pdfSettings[documentType].fields;
}

/**
 * Get default terms and conditions for a specific document type
 */
export function getDefaultTermsAndConditions(documentType: DocumentType): string {
  return pdfSettings[documentType].defaultTermsAndConditions;
}

/**
 * Get default validity days for a specific document type
 * Only applicable for quotation and invoice
 */
export function getDefaultValidityDays(documentType: DocumentType): number {
  return pdfSettings[documentType].defaultValidityDays ?? 2;
}

// ============= Update Operations =============

/**
 * Update field settings for a specific document type
 */
export function updateDocumentFieldSettings(
  documentType: DocumentType,
  updates: Partial<PdfFieldSettings>
): DocumentPdfSettings {
  pdfSettings[documentType].fields = {
    ...pdfSettings[documentType].fields,
    ...updates,
  };
  return pdfSettings[documentType];
}

/**
 * Update default terms and conditions for a specific document type
 */
export function updateDefaultTermsAndConditions(
  documentType: DocumentType,
  terms: string
): DocumentPdfSettings {
  pdfSettings[documentType].defaultTermsAndConditions = terms;
  return pdfSettings[documentType];
}

/**
 * Update default validity days for a specific document type
 * Only applicable for quotation and invoice
 */
export function updateDefaultValidityDays(
  documentType: DocumentType,
  days: number
): DocumentPdfSettings {
  pdfSettings[documentType].defaultValidityDays = days;
  return pdfSettings[documentType];
}

/**
 * Update all settings for a specific document type
 */
export function updateDocumentPdfSettings(
  documentType: DocumentType,
  settings: DocumentPdfSettings
): DocumentPdfSettings {
  pdfSettings[documentType] = settings;
  return pdfSettings[documentType];
}

/**
 * Reset settings to defaults for a specific document type
 */
export function resetDocumentPdfSettings(documentType: DocumentType): DocumentPdfSettings {
  const defaultTerms = {
    quotation: defaultQuotationTerms,
    invoice: defaultInvoiceTerms,
    receipt: defaultReceiptTerms,
  };

  const defaultValidityDays = {
    quotation: 2,
    invoice: 30,
    receipt: undefined,
  };

  pdfSettings[documentType] = {
    fields: { ...defaultFieldSettings },
    defaultTermsAndConditions: defaultTerms[documentType],
    defaultValidityDays: defaultValidityDays[documentType],
  };

  return pdfSettings[documentType];
}

/**
 * Reset all PDF settings to defaults
 */
export function resetAllPdfSettings(): PdfSettings {
  pdfSettings = {
    quotation: {
      fields: { ...defaultFieldSettings },
      defaultTermsAndConditions: defaultQuotationTerms,
      defaultValidityDays: 2,
    },
    invoice: {
      fields: { ...defaultFieldSettings },
      defaultTermsAndConditions: defaultInvoiceTerms,
      defaultValidityDays: 30,
    },
    receipt: {
      fields: { ...defaultFieldSettings },
      defaultTermsAndConditions: defaultReceiptTerms,
    },
  };

  return pdfSettings;
}
