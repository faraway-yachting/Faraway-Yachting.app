'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateReceiptPdf, uploadReceiptPdf, type ReceiptPdfData } from '@/lib/pdf/generateReceiptPdf';
import { Loader2, FileText, CheckCircle, XCircle, Play } from 'lucide-react';

interface ReceiptWithDetails {
  id: string;
  receipt_number: string;
  receipt_date: string;
  client_name: string;
  company_id: string;
  client_id: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes: string | null;
  charter_type: string | null;
  charter_date_from: string | null;
  charter_date_to: string | null;
  charter_time: string | null;
  attachments: unknown[] | null;
  pricing_type: string | null;
  reference: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_rate: number | null;
    wht_rate: string | null;
    custom_wht_amount: number | null;
  }>;
  payment_records: Array<{
    payment_date: string;
    amount: number;
    received_at: string;
    remark: string | null;
  }>;
}

interface CompanyInfo {
  id: string;
  name: string;
  tax_id: string | null;
  is_vat_registered: boolean | null;
  registered_address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  contact_information: {
    phoneNumber?: string;
    email?: string;
  } | null;
}

interface ContactInfo {
  id: string;
  email: string | null;
  tax_id: string | null;
  billing_address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
}

export default function GenerateReceiptPdfsPage() {
  const [receiptsNeedingPdf, setReceiptsNeedingPdf] = useState<ReceiptWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: [],
  });
  const [companies, setCompanies] = useState<Map<string, CompanyInfo>>(new Map());
  const [contacts, setContacts] = useState<Map<string, ContactInfo>>(new Map());

  // Load receipts needing PDFs
  useEffect(() => {
    loadReceiptsNeedingPdf();
  }, []);

  const loadReceiptsNeedingPdf = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Fetch all paid receipts with their line items and payment records
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(`
          *,
          line_items:receipt_line_items(*),
          payment_records:receipt_payment_records(*)
        `)
        .eq('status', 'paid')
        .order('receipt_date', { ascending: false });

      if (error) throw error;

      // Filter to only receipts without attachments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receiptsWithoutPdf = (receipts || []).filter((r: any) => {
        const attachments = r.attachments as unknown[] | null;
        return !attachments || attachments.length === 0;
      }) as unknown as ReceiptWithDetails[];

      setReceiptsNeedingPdf(receiptsWithoutPdf);

      // Load all companies
      const companyIds = [...new Set(receiptsWithoutPdf.map((r) => r.company_id))];
      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name, tax_id, is_vat_registered, registered_address, contact_information')
          .in('id', companyIds);

        const companyMap = new Map<string, CompanyInfo>();
        (companiesData || []).forEach((c) => {
          companyMap.set(c.id, c as CompanyInfo);
        });
        setCompanies(companyMap);
      }

      // Load all clients
      const clientIds = [...new Set(receiptsWithoutPdf.map((r) => r.client_id).filter(Boolean))] as string[];
      if (clientIds.length > 0) {
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, email, tax_id, billing_address')
          .in('id', clientIds);

        const contactMap = new Map<string, ContactInfo>();
        (contactsData || []).forEach((c) => {
          contactMap.set(c.id, c as ContactInfo);
        });
        setContacts(contactMap);
      }
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAllPdfs = async () => {
    if (receiptsNeedingPdf.length === 0) return;

    setIsGenerating(true);
    setProgress({ current: 0, total: receiptsNeedingPdf.length });
    setResults({ success: 0, failed: 0, errors: [] });

    const supabase = createClient();
    let successCount = 0;
    let failedCount = 0;
    const errorMessages: string[] = [];

    for (let i = 0; i < receiptsNeedingPdf.length; i++) {
      const receipt = receiptsNeedingPdf[i];
      setProgress({ current: i + 1, total: receiptsNeedingPdf.length });

      try {
        // Get company info
        const company = companies.get(receipt.company_id);
        const client = receipt.client_id ? contacts.get(receipt.client_id) : null;

        // Build company address string
        const companyAddr = company?.registered_address;
        const companyAddressStr = companyAddr
          ? [companyAddr.street, companyAddr.city, companyAddr.state, companyAddr.postalCode, companyAddr.country]
              .filter(Boolean)
              .join(', ')
          : undefined;

        // Build client address string
        const clientAddr = client?.billing_address;
        const clientAddressStr = clientAddr
          ? [clientAddr.street, clientAddr.city, clientAddr.state, clientAddr.postalCode, clientAddr.country]
              .filter(Boolean)
              .join(', ')
          : undefined;

        // Calculate WHT amount from line items
        let whtAmount = 0;
        for (const item of receipt.line_items) {
          if (item.wht_rate === 'custom' && item.custom_wht_amount) {
            whtAmount += item.custom_wht_amount;
          } else if (item.wht_rate && !isNaN(parseFloat(item.wht_rate))) {
            const rate = parseFloat(item.wht_rate) / 100;
            whtAmount += item.amount * rate;
          }
        }

        // Build PDF data
        const pdfData: ReceiptPdfData = {
          receiptNumber: receipt.receipt_number,
          receiptDate: receipt.receipt_date,
          reference: receipt.reference || undefined,
          companyName: company?.name || '',
          companyAddress: companyAddressStr,
          companyPhone: company?.contact_information?.phoneNumber,
          companyEmail: company?.contact_information?.email,
          companyTaxId: company?.tax_id || undefined,
          isVatRegistered: company?.is_vat_registered || false,
          clientName: receipt.client_name,
          clientAddress: clientAddressStr,
          clientEmail: client?.email || undefined,
          clientTaxId: client?.tax_id || undefined,
          charterType: receipt.charter_type || undefined,
          charterDateFrom: receipt.charter_date_from || undefined,
          charterDateTo: receipt.charter_date_to || undefined,
          charterTime: receipt.charter_time || undefined,
          lineItems: receipt.line_items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            amount: item.amount,
            taxRate: item.tax_rate || 0,
            whtRate: item.wht_rate || undefined,
            customWhtAmount: item.custom_wht_amount || undefined,
          })),
          pricingType: (receipt.pricing_type as 'no_vat' | 'exclude_vat' | 'include_vat') || 'exclude_vat',
          subtotal: receipt.subtotal,
          taxAmount: receipt.tax_amount,
          whtAmount,
          totalAmount: receipt.total_amount,
          netAmountToPay: receipt.total_amount - whtAmount,
          currency: receipt.currency,
          payments: receipt.payment_records.map((p) => ({
            date: p.payment_date,
            amount: p.amount,
            method: p.received_at === 'cash' ? 'Cash' : 'Bank Transfer',
            remark: p.remark || undefined,
          })),
          notes: receipt.notes || undefined,
        };

        // Generate PDF
        const pdfBytes = await generateReceiptPdf(pdfData);

        // Upload to storage
        const uploadResult = await uploadReceiptPdf(pdfBytes, receipt.id, receipt.receipt_number);

        if (uploadResult) {
          // Update receipt with attachment
          const pdfAttachment = {
            id: `auto-pdf-${Date.now()}`,
            name: uploadResult.name,
            size: pdfBytes.length,
            type: 'application/pdf',
            url: uploadResult.url,
          };

          const { error: updateError } = await supabase
            .from('receipts')
            .update({ attachments: [pdfAttachment] } as Record<string, unknown>)
            .eq('id', receipt.id);

          if (updateError) {
            throw new Error(`Failed to update receipt: ${updateError.message}`);
          }

          successCount++;
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        failedCount++;
        const errorMsg = `${receipt.receipt_number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errorMessages.push(errorMsg);
        console.error(`Failed to generate PDF for ${receipt.receipt_number}:`, error);
      }

      // Update results in real-time
      setResults({ success: successCount, failed: failedCount, errors: errorMessages });
    }

    setIsGenerating(false);

    // Reload the list
    await loadReceiptsNeedingPdf();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Receipt PDFs</h1>
        <p className="text-gray-600 mb-8">
          Generate and attach PDF files to existing paid receipts for display in P&L drill-down.
        </p>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading receipts...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-medium">{receiptsNeedingPdf.length}</span>
                  <span className="text-gray-600">paid receipts need PDF generation</span>
                </div>
              </div>

              {receiptsNeedingPdf.length > 0 && !isGenerating && (
                <button
                  onClick={generateAllPdfs}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Generate All PDFs
                </button>
              )}

              {receiptsNeedingPdf.length === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>All paid receipts have PDF attachments!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Card */}
        {isGenerating && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#5A7A8F]" />
                <span>
                  Processing {progress.current} of {progress.total}...
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#5A7A8F] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>

              <div className="flex gap-6 text-sm">
                <span className="text-green-600">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {results.success} succeeded
                </span>
                <span className="text-red-600">
                  <XCircle className="h-4 w-4 inline mr-1" />
                  {results.failed} failed
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results Card */}
        {!isGenerating && (results.success > 0 || results.failed > 0) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>

            <div className="space-y-4">
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{results.success}</span>
                  <span>PDFs generated successfully</span>
                </div>
                {results.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">{results.failed}</span>
                    <span>failed</span>
                  </div>
                )}
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-red-600 mb-2">Errors:</h3>
                  <ul className="text-sm text-red-600 bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {results.errors.map((err, i) => (
                      <li key={i} className="py-1">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receipts List */}
        {!isLoading && receiptsNeedingPdf.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Receipts Pending PDF Generation ({receiptsNeedingPdf.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Receipt #</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Date</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Client</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptsNeedingPdf.slice(0, 50).map((receipt) => (
                    <tr key={receipt.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{receipt.receipt_number}</td>
                      <td className="py-2 px-3">{new Date(receipt.receipt_date).toLocaleDateString()}</td>
                      <td className="py-2 px-3">{receipt.client_name}</td>
                      <td className="py-2 px-3 text-right">
                        {receipt.total_amount.toLocaleString()} {receipt.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {receiptsNeedingPdf.length > 50 && (
                <p className="text-sm text-gray-500 mt-2 px-3">
                  Showing first 50 of {receiptsNeedingPdf.length} receipts
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
