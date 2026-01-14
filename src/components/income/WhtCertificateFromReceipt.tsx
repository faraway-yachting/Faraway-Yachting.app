'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2 } from 'lucide-react';
import type { LineItem, PricingType } from '@/data/income/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import { fillWhtCertificate, numberToThaiWords, type WhtCertificateData } from '@/lib/pdf/fillWhtCertificate';

// Calculate WHT amount for a line item
function calculateWhtAmount(item: LineItem): number {
  if (item.whtRate === 'custom' && item.customWhtAmount) {
    return item.customWhtAmount;
  }
  if (typeof item.whtRate === 'number' && item.whtRate > 0) {
    const baseAmount = item.unitPrice * item.quantity;
    return baseAmount * (item.whtRate / 100);
  }
  return 0;
}

// Generate certificate number in format WHTYYMMXXX
function generateCertificateNumber(receiptNumber: string, date: string): string {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  // Extract sequence from receipt number or use a default
  const seqMatch = receiptNumber.match(/(\d{3,4})$/);
  const seq = seqMatch ? seqMatch[1].slice(-3).padStart(3, '0') : '001';
  return `WHT${yy}${mm}${seq}`;
}

// Get descriptions from line items that have WHT
function getWhtDescriptions(lineItems: LineItem[]): string {
  const whtItems = lineItems.filter(item => {
    if (item.whtRate === 'custom' && item.customWhtAmount) return true;
    if (typeof item.whtRate === 'number' && item.whtRate > 0) return true;
    return false;
  });

  const descriptions = whtItems
    .map(item => item.description)
    .filter(desc => desc && desc.trim() !== '');

  if (descriptions.length === 0) return 'ค่าบริการ';
  if (descriptions.length === 1) return descriptions[0];
  return descriptions.slice(0, 2).join(', ') + (descriptions.length > 2 ? '...' : '');
}

interface WhtCertificateFromReceiptProps {
  receipt: {
    receiptNumber?: string;
    receiptDate: string;
    lineItems: LineItem[];
    pricingType: PricingType;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
  };
  company: Company | undefined;  // Our company (payee - receiving payment)
  client: Contact | undefined;   // Customer (payer - withholds tax)
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * WHT Certificate for Receipts
 *
 * In this context:
 * - PAYER (ผู้มีหน้าที่หักภาษี) = Customer (who withholds tax from payment to us)
 * - PAYEE (ผู้ถูกหักภาษี) = Our Company (who receives the payment minus WHT)
 *
 * This is the reverse of the Finance module's WHT certificate where we pay suppliers.
 */
export default function WhtCertificateFromReceipt({
  receipt,
  company,
  client,
  clientName,
  isOpen,
  onClose,
}: WhtCertificateFromReceiptProps) {
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate total WHT from line items
  const calculateTotalWht = useCallback(() => {
    return receipt.lineItems.reduce((sum, item) => sum + calculateWhtAmount(item), 0);
  }, [receipt.lineItems]);

  // Calculate payment amount (base amount before WHT)
  const calculatePaymentAmount = useCallback(() => {
    // Sum of line item amounts (base amounts)
    return receipt.lineItems.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);
  }, [receipt.lineItems]);

  // Format date to Buddhist year
  const formatThaiDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear() + 543, // Convert to Buddhist year
    };
  }, []);

  // Get address string
  const getAddressString = useCallback((address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }): string => {
    if (!address) return '';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean);
    return parts.join(' ');
  }, []);

  // Generate PDF when modal opens
  const generatePdf = useCallback(async () => {
    if (!isOpen) return;

    setIsGenerating(true);
    setError(null);

    try {
      const paymentDate = formatThaiDate(receipt.receiptDate);
      const totalWht = calculateTotalWht();
      const paymentAmount = calculatePaymentAmount();

      // IMPORTANT: For receipts, roles are reversed from expenses
      // - Customer is the PAYER (who withholds tax)
      // - Our company is the PAYEE (who receives payment)

      const data: WhtCertificateData = {
        // Payer = Customer (they withhold tax from their payment to us)
        payerName: clientName || 'Customer',
        payerTaxId: client?.taxId || '',
        payerAddress: getAddressString(client?.billingAddress),

        // Payee = Our Company (we receive payment minus WHT)
        payeeName: company?.name || 'Company',
        payeeTaxId: company?.taxId || '',
        payeeAddress: getAddressString(company?.registeredAddress),

        // Document info
        certificateNumber: generateCertificateNumber(
          receipt.receiptNumber || 'DRAFT',
          receipt.receiptDate
        ),

        // Transaction amounts
        paymentDate,
        paymentAmount,
        whtAmount: totalWht,
        whtAmountWords: numberToThaiWords(totalWht),
        incomeDescription: getWhtDescriptions(receipt.lineItems),

        // Form type - use PND53 for corporate customers (most common)
        // Could be enhanced to check if client is individual (PND3) or corporate (PND53)
        formType: 'pnd53',
      };

      const pdfBytes = await fillWhtCertificate(data);

      // Create blob URL for preview
      const blob = new Blob([pdfBytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error generating WHT certificate PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [isOpen, receipt, company, client, clientName, formatThaiDate, getAddressString, calculateTotalWht, calculatePaymentAmount]);

  // Generate PDF when modal opens
  useEffect(() => {
    if (isOpen && !pdfUrl && !isGenerating) {
      generatePdf();
    }
  }, [isOpen, pdfUrl, isGenerating, generatePdf]);

  // Cleanup blob URL when modal closes
  useEffect(() => {
    if (!isOpen && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [isOpen, pdfUrl]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!pdfUrl) return;

    // Generate filename
    const date = new Date(receipt.receiptDate);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const receiptNum = receipt.receiptNumber || 'DRAFT';
    const seqMatch = receiptNum.match(/(\d{3,4})$/);
    const seq = seqMatch ? seqMatch[1].slice(-3).padStart(3, '0') : '001';
    const filename = `WHT${yy}${mm}${seq}-${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfUrl, receipt, clientName]);

  if (!isOpen || !mounted) return null;

  const totalWht = calculateTotalWht();

  const content = (
    <div className="fixed inset-0 z-[9999] overflow-auto bg-gray-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={!pdfUrl || isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          {isGenerating && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F] mx-auto mb-4" />
                <p className="text-gray-600">Generating PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mb-2">Error generating PDF</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <button
                  onClick={generatePdf}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {pdfUrl && !isGenerating && !error && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-[70vh]"
                title="WHT Certificate Preview"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <p>
            Receipt: {receipt.receiptNumber || 'Draft'} |
            Customer (Payer): {clientName} |
            WHT Amount: ฿{totalWht.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
