'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import type { LineItem, PricingType } from '@/data/income/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import { formatCurrency, formatDate } from '@/lib/income/utils';

interface WhtReceiptPrintViewProps {
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
  company: Company | undefined;
  client: Contact | undefined;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

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

export default function WhtReceiptPrintView({
  receipt,
  company,
  client,
  clientName,
  isOpen,
  onClose,
}: WhtReceiptPrintViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set document title for PDF filename
  useEffect(() => {
    if (isOpen) {
      const originalTitle = document.title;
      const companyName = company?.name || 'WHT';
      const docNumber = receipt.receiptNumber || 'Draft';
      document.title = `WHT-${companyName}-${docNumber}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, company?.name, receipt.receiptNumber]);

  // Add body class for print CSS isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('printing-wht-receipt');
      return () => {
        document.body.classList.remove('printing-wht-receipt');
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  // Filter line items that have WHT
  const whtLineItems = receipt.lineItems.filter(item => {
    if (item.whtRate === 'custom' && item.customWhtAmount) return true;
    if (typeof item.whtRate === 'number' && item.whtRate > 0) return true;
    return false;
  });

  // Calculate total WHT
  const totalWht = whtLineItems.reduce((sum, item) => sum + calculateWhtAmount(item), 0);

  // Get Thai date parts for display
  const receiptDate = new Date(receipt.receiptDate);
  const thaiYear = receiptDate.getFullYear() + 543;
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiMonth = monthNames[receiptDate.getMonth()];
  const thaiDay = receiptDate.getDate();

  const printContent = (
    <div className="print-portal fixed inset-0 z-[9999] overflow-auto bg-gray-900/50 print:bg-white print:static print:overflow-visible">
      {/* Print Controls - Hidden when printing */}
      <div className="print-controls sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden">
        <h2 className="text-lg font-semibold text-gray-900">WHT Summary</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
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

      {/* Print Content */}
      <div className="bg-gray-100 py-8 print:bg-white print:py-0">
        <div className="print-page max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              รายละเอียดภาษีหัก ณ ที่จ่าย
            </h1>
            <h2 className="text-lg text-gray-700">
              Withholding Tax Summary
            </h2>
          </div>

          {/* Company Info (Payee - us, receiving payment) */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              ผู้รับเงิน (Payee)
            </h3>
            <div className="text-sm text-gray-900">
              <p className="font-semibold text-base">{company?.name || 'Company Name'}</p>
              {company?.taxId && (
                <p className="text-gray-600">Tax ID: {company.taxId}</p>
              )}
              {company?.registeredAddress && (
                <p className="text-gray-600">
                  {company.registeredAddress.street}, {company.registeredAddress.city}{' '}
                  {company.registeredAddress.postalCode}
                </p>
              )}
            </div>
          </div>

          {/* Payer Info (Customer - who withholds tax) */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-2">
              ผู้จ่ายเงิน / ผู้หักภาษี (Payer / Withholder)
            </h3>
            <div className="text-sm text-gray-900">
              <p className="font-semibold text-base">{clientName || 'Customer Name'}</p>
              {client?.taxId && (
                <p className="text-gray-600">Tax ID: {client.taxId}</p>
              )}
              {client?.billingAddress && (
                <p className="text-gray-600">
                  {client.billingAddress.street}, {client.billingAddress.city}{' '}
                  {client.billingAddress.postalCode}
                </p>
              )}
            </div>
          </div>

          {/* Document Info */}
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Receipt No:</span>
              <span className="ml-2 font-semibold">{receipt.receiptNumber || 'Draft'}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Date:</span>
              <span className="ml-2 font-semibold">
                {thaiDay} {thaiMonth} {thaiYear} ({formatDate(receipt.receiptDate)})
              </span>
            </div>
          </div>

          {/* WHT Details Table */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              รายการภาษีหัก ณ ที่จ่าย (WHT Details)
            </h3>
            <table className="w-full text-sm border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">#</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Description</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b">Amount</th>
                  <th className="py-2 px-3 text-center font-semibold text-gray-700 border-b">WHT %</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b">WHT Amount</th>
                </tr>
              </thead>
              <tbody>
                {whtLineItems.map((item, index) => {
                  const baseAmount = item.unitPrice * item.quantity;
                  const whtAmount = calculateWhtAmount(item);
                  return (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2 px-3 text-gray-600">{index + 1}</td>
                      <td className="py-2 px-3 text-gray-900">{item.description}</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(baseAmount, receipt.currency as 'THB' | 'USD' | 'EUR')}
                      </td>
                      <td className="py-2 px-3 text-center text-gray-600">
                        {item.whtRate === 'custom' ? 'Custom' : `${item.whtRate}%`}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-900">
                        {formatCurrency(whtAmount, receipt.currency as 'THB' | 'USD' | 'EUR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="py-2 px-3 text-right">
                    Total Withholding Tax:
                  </td>
                  <td className="py-2 px-3 text-right text-lg">
                    {formatCurrency(totalWht, receipt.currency as 'THB' | 'USD' | 'EUR')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary */}
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-sm font-semibold text-amber-700 mb-3">Summary</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600">Subtotal:</td>
                  <td className="py-1 text-right text-gray-900">
                    {formatCurrency(receipt.subtotal, receipt.currency as 'THB' | 'USD' | 'EUR')}
                  </td>
                </tr>
                {receipt.taxAmount > 0 && (
                  <tr>
                    <td className="py-1 text-gray-600">VAT:</td>
                    <td className="py-1 text-right text-gray-900">
                      {formatCurrency(receipt.taxAmount, receipt.currency as 'THB' | 'USD' | 'EUR')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 text-gray-600">Total Amount:</td>
                  <td className="py-1 text-right text-gray-900">
                    {formatCurrency(receipt.totalAmount, receipt.currency as 'THB' | 'USD' | 'EUR')}
                  </td>
                </tr>
                <tr className="border-t border-amber-300">
                  <td className="py-1 text-amber-700 font-semibold">Withholding Tax:</td>
                  <td className="py-1 text-right text-amber-700 font-semibold">
                    -{formatCurrency(totalWht, receipt.currency as 'THB' | 'USD' | 'EUR')}
                  </td>
                </tr>
                <tr className="text-lg font-bold">
                  <td className="py-2 text-gray-900">Net Amount Received:</td>
                  <td className="py-2 text-right text-gray-900">
                    {formatCurrency(receipt.totalAmount - totalWht, receipt.currency as 'THB' | 'USD' | 'EUR')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="text-xs text-gray-500 mt-8">
            <p className="mb-2">
              <strong>Note:</strong> This is a summary of withholding tax deducted from this receipt.
              The official WHT certificate (ภ.ง.ด. 53) should be issued by the payer (customer).
            </p>
            <p>
              <strong>หมายเหตุ:</strong> นี่คือสรุปภาษีหัก ณ ที่จ่ายจากใบเสร็จรับเงินนี้
              หนังสือรับรองการหักภาษี ณ ที่จ่าย (ภ.ง.ด. 53) ต้องออกโดยผู้จ่ายเงิน (ลูกค้า)
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            Printed on {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(printContent, document.body);
}
