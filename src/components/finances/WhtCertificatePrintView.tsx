'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2 } from 'lucide-react';
import type { WhtToSupplier } from '@/data/finances/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import { fillWhtCertificate, numberToThaiWords, type WhtCertificateData } from '@/lib/pdf/fillWhtCertificate';
import { getExpenseRecordById } from '@/data/expenses/expenses';

// Generate certificate number in format WHTYYMMXXX (e.g., WHT2512001)
function generateCertificateNumber(date: string, certNum: string): string {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const seqMatch = certNum.match(/(\d{3})$/);
  const seq = seqMatch ? seqMatch[1] : '001';
  return `WHT${yy}${mm}${seq}`;
}

// Get income descriptions from linked expense records
function getIncomeDescription(expenseRecordIds?: string[]): string {
  if (!expenseRecordIds || expenseRecordIds.length === 0) {
    return 'ค่าบริการ'; // Default fallback
  }
  const descriptions: string[] = [];
  for (const expenseId of expenseRecordIds) {
    const expense = getExpenseRecordById(expenseId);
    if (expense) {
      for (const item of expense.lineItems) {
        if (item.description && !descriptions.includes(item.description)) {
          descriptions.push(item.description);
        }
      }
    }
  }
  return descriptions.length > 0 ? descriptions.join(', ') : 'ค่าบริการ';
}

interface WhtCertificatePrintViewProps {
  transaction: WhtToSupplier;
  company: Company | undefined;
  supplier: Contact | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export default function WhtCertificatePrintView({
  transaction,
  company,
  supplier,
  isOpen,
  onClose,
}: WhtCertificatePrintViewProps) {
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const paymentDate = formatThaiDate(transaction.date);
      const companyAddress = getAddressString(company?.registeredAddress);
      const supplierAddress = getAddressString(supplier?.billingAddress);

      // Use supplier name directly (no prefix/suffix added)
      const payeeName = transaction.supplierName;

      const data: WhtCertificateData = {
        payerName: company?.name || transaction.companyName,
        payerTaxId: company?.taxId || '',
        payerAddress: companyAddress,
        payeeName,
        payeeTaxId: transaction.supplierTaxId,
        payeeAddress: supplierAddress,
        certificateNumber: generateCertificateNumber(
          transaction.date,
          transaction.whtCertificateNumber || transaction.documentNumber || ''
        ),
        paymentDate,
        paymentAmount: transaction.paymentAmount,
        whtAmount: transaction.whtAmount,
        whtAmountWords: numberToThaiWords(transaction.whtAmount),
        incomeDescription: getIncomeDescription(transaction.expenseRecordIds),
        formType: transaction.whtType,
      };

      const pdfBytes = await fillWhtCertificate(data);

      // Create blob URL for preview - use slice to get a copy as ArrayBuffer
      const blob = new Blob([pdfBytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [isOpen, transaction, company, supplier, formatThaiDate, getAddressString]);

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

    // Generate filename in format WHTYYMMXXX (e.g., WHT2512001)
    const date = new Date(transaction.date);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    // Extract sequence number from certificate number (last 3 digits or use a default)
    const certNum = transaction.whtCertificateNumber || transaction.documentNumber || '';
    const seqMatch = certNum.match(/(\d{3})$/);
    const seq = seqMatch ? seqMatch[1] : '001';
    const filename = `WHT${yy}${mm}${seq}.pdf`;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfUrl, transaction]);

  if (!isOpen || !mounted) return null;

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
            Certificate: {transaction.whtCertificateNumber || transaction.documentNumber} |
            Supplier: {transaction.supplierName} |
            Amount: ฿{transaction.whtAmount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
