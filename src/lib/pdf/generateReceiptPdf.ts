import type { ReceiptTemplateData } from './receiptHtmlTemplate';

export interface ReceiptPdfData {
  // Document info
  receiptNumber: string;
  receiptDate: string;
  reference?: string;

  // Company info
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string;
  isVatRegistered?: boolean;

  // Client info
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientTaxId?: string;

  // Charter info
  charterType?: string;
  charterDateFrom?: string;
  charterDateTo?: string;
  charterTime?: string;

  // Line items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    whtRate?: number | string;
    customWhtAmount?: number;
  }>;

  // Pricing type
  pricingType?: 'no_vat' | 'exclude_vat' | 'include_vat';

  // Totals
  subtotal: number;
  taxAmount: number;
  whtAmount: number;
  totalAmount: number;
  netAmountToPay?: number;
  currency: string;

  // Payments
  payments: Array<{
    date: string;
    amount: number;
    method: string;
    remark?: string;
  }>;

  // Additional
  notes?: string;
  createdBy?: string;
}

/**
 * Map ReceiptPdfData to ReceiptTemplateData for the HTML template
 */
function mapToTemplateData(data: ReceiptPdfData): ReceiptTemplateData {
  return {
    receiptNumber: data.receiptNumber,
    receiptDate: data.receiptDate,
    reference: data.reference,
    companyName: data.companyName,
    companyAddress: data.companyAddress,
    companyPhone: data.companyPhone,
    companyEmail: data.companyEmail,
    companyTaxId: data.companyTaxId,
    isVatRegistered: data.isVatRegistered,
    clientName: data.clientName,
    clientAddress: data.clientAddress,
    clientEmail: data.clientEmail,
    clientTaxId: data.clientTaxId,
    charterType: data.charterType,
    charterDateFrom: data.charterDateFrom,
    charterDateTo: data.charterDateTo,
    charterTime: data.charterTime,
    lineItems: data.lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      taxRate: item.taxRate,
      whtRate: item.whtRate,
      customWhtAmount: item.customWhtAmount,
    })),
    pricingType: data.pricingType,
    subtotal: data.subtotal,
    taxAmount: data.taxAmount,
    whtAmount: data.whtAmount,
    totalAmount: data.totalAmount,
    netAmountToPay: data.netAmountToPay,
    currency: data.currency,
    payments: data.payments.map(p => ({
      date: p.date,
      amount: p.amount,
      receivedAt: p.method, // Map 'method' to 'receivedAt'
      remark: p.remark,
    })),
    notes: data.notes,
    createdBy: data.createdBy,
  };
}

/**
 * Generate a Receipt PDF using server-side Puppeteer via API
 *
 * This function calls the /api/receipts/generate-pdf endpoint which uses
 * Puppeteer to render the same HTML template as the Print Preview.
 */
export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  // Convert to template data format
  const templateData = mapToTemplateData(data);

  // Determine the base URL for API calls
  // In browser, use relative URL; in server context, construct full URL
  const baseUrl = typeof window !== 'undefined'
    ? ''
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/receipts/generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templateData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`PDF generation failed: ${errorData.error || response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Upload a generated PDF to Supabase Storage
 */
export async function uploadReceiptPdf(
  pdfBytes: Uint8Array,
  receiptId: string,
  receiptNumber: string
): Promise<{ url: string; name: string } | null> {
  try {
    // Dynamic import to avoid SSR issues
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Generate filename
    const timestamp = Date.now();
    const safeName = receiptNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const fileName = `Receipt_${safeName}.pdf`;
    const filePath = `receipt-attachments/${receiptId}/${timestamp}-${fileName}`;

    // Upload to storage
    const { error } = await supabase.storage
      .from('Documents')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      console.error('Failed to upload receipt PDF:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Documents')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: fileName,
    };
  } catch (error) {
    console.error('Error uploading receipt PDF:', error);
    return null;
  }
}
