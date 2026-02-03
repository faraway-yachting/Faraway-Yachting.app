import { createClient } from '../client';
import type { PdfSettings, DocumentPdfSettings, DocumentType } from '@/data/settings/types';

// Default field settings - used as fallback
const defaultFieldSettings = {
  showCompanyAddress: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showCompanyTaxId: true,
  showClientAddress: true,
  showClientEmail: true,
  showClientTaxId: false,
  showValidUntil: true,
  showVatColumn: true,
  showWhtColumn: true,
  showSubtotal: true,
  showVatAmount: true,
  showWhtAmount: true,
  showNetAmountToPay: true,
  showPaymentDetails: true,
  showTermsAndConditions: true,
  showCreatedBySignature: true,
};

const defaultTerms = {
  quotation: `Payment Terms:
- 50% deposit required upon acceptance
- Balance due before charter commencement
- All prices are subject to applicable taxes

Cancellation Policy:
- Cancellations made 30+ days before charter: Full refund minus 10% admin fee
- Cancellations made 14-29 days before charter: 50% refund
- Cancellations made less than 14 days before charter: No refund`,
  invoice: `Payment Terms:
- Payment is due within the specified due date
- Late payments may incur interest charges
- All prices include applicable taxes as shown

Bank Transfer Instructions:
- Please include invoice number as payment reference
- Bank details are provided above`,
  receipt: `This receipt confirms payment received.
- Keep this receipt for your records
- Contact us if you have any questions about this payment`,
};

const defaultValidityDays = {
  quotation: 2,
  invoice: 30,
  receipt: undefined,
};

function parseDocumentSettings(data: unknown, docType: DocumentType): DocumentPdfSettings {
  const settings = data as Record<string, unknown> | null;
  return {
    fields: (settings?.fields as DocumentPdfSettings['fields']) || { ...defaultFieldSettings },
    defaultTermsAndConditions: (settings?.defaultTermsAndConditions as string) || defaultTerms[docType],
    defaultValidityDays: (settings?.defaultValidityDays as number) ?? defaultValidityDays[docType],
  };
}

export const pdfSettingsApi = {
  async get(): Promise<PdfSettings> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pdf_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      // If table doesn't exist yet (before migration), return defaults
      console.warn('PDF settings not found, using defaults:', error.message);
      return {
        quotation: {
          fields: { ...defaultFieldSettings },
          defaultTermsAndConditions: defaultTerms.quotation,
          defaultValidityDays: 2,
        },
        invoice: {
          fields: { ...defaultFieldSettings },
          defaultTermsAndConditions: defaultTerms.invoice,
          defaultValidityDays: 30,
        },
        receipt: {
          fields: { ...defaultFieldSettings },
          defaultTermsAndConditions: defaultTerms.receipt,
        },
      };
    }

    return {
      quotation: parseDocumentSettings(data.quotation, 'quotation'),
      invoice: parseDocumentSettings(data.invoice, 'invoice'),
      receipt: parseDocumentSettings(data.receipt, 'receipt'),
    };
  },

  async update(documentType: DocumentType, settings: DocumentPdfSettings): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pdf_settings')
      .update({
        [documentType]: settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'default');

    if (error) {
      console.error('Failed to update PDF settings:', error);
      throw error;
    }
  },
};
