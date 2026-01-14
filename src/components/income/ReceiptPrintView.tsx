'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import type { PaymentRecord, AdjustmentType, LineItem, PricingType } from '@/data/income/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import type { BankAccount } from '@/data/banking/types';
import { formatCurrency, formatDate } from '@/lib/income/utils';
import { getDocumentFieldSettings } from '@/data/settings/pdfSettings';

// Items per page - conservative for multi-line descriptions
// First page has less room because it may need footer if only 1 page
// Content-only pages (middle pages) can have more items since no footer
const ITEMS_FIRST_PAGE = 2;  // Conservative - allows room for footer on single page
const ITEMS_PER_PAGE = 4;    // Middle pages - content only, no footer

interface ReceiptPrintViewProps {
  receipt: {
    receiptNumber?: string;
    receiptDate: string;
    reference?: string;
    boatId?: string;
    charterType?: string;
    charterDateFrom?: string;
    charterDateTo?: string;
    charterTime?: string;
    lineItems: LineItem[];
    pricingType: PricingType;
    subtotal: number;
    taxAmount: number;
    whtAmount: number;
    totalAmount: number;
    payments: PaymentRecord[];
    adjustmentType?: AdjustmentType;
    adjustmentAmount?: number;
    adjustmentRemark?: string;
    netAmountToPay?: number;
    totalPayments?: number;
    totalReceived?: number;
    remainingAmount?: number;
    currency: string;
    notes?: string;
  };
  company: Company | undefined;
  client: Contact | undefined;
  clientName: string;
  bankAccount?: BankAccount;
  bankAccounts?: BankAccount[];
  createdBy?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptPrintView({
  receipt,
  company,
  client,
  clientName,
  bankAccount,
  bankAccounts = [],
  createdBy,
  isOpen,
  onClose,
}: ReceiptPrintViewProps) {
  // Support both single bankAccount and bankAccounts array
  const effectiveBankAccounts = bankAccount ? [bankAccount] : bankAccounts;
  const [mounted, setMounted] = useState(false);

  // Get PDF field settings for receipts (use invoice settings as base)
  const fieldSettings = getDocumentFieldSettings('invoice');

  // Filter valid line items
  const validLineItems = useMemo(() =>
    receipt.lineItems.filter((item) => item.description.trim() !== '' || item.unitPrice > 0),
    [receipt.lineItems]
  );

  // Split line items into pages with smart pagination
  const { contentPages, needsSeparateFooterPage } = useMemo(() => {
    const items = [...validLineItems];
    const pages: LineItem[][] = [];

    // If all items fit on first page (with footer), single page
    if (items.length <= ITEMS_FIRST_PAGE) {
      return {
        contentPages: [items],
        needsSeparateFooterPage: false
      };
    }

    // First page - limited items
    pages.push(items.splice(0, ITEMS_FIRST_PAGE));

    // Middle pages - more items since no footer
    while (items.length > ITEMS_FIRST_PAGE) {
      pages.push(items.splice(0, ITEMS_PER_PAGE));
    }

    // Remaining items go on last page with footer
    if (items.length > 0) {
      pages.push(items);
      return { contentPages: pages, needsSeparateFooterPage: false };
    } else {
      // All items consumed, footer needs its own page
      return { contentPages: pages, needsSeparateFooterPage: true };
    }
  }, [validLineItems]);

  // Total pages = content pages + 1 if footer needs separate page
  const totalPages = contentPages.length + (needsSeparateFooterPage ? 1 : 0);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set document title for PDF filename: "Company ReceiptNumber"
  useEffect(() => {
    if (isOpen) {
      const originalTitle = document.title;
      const companyName = company?.name || 'Receipt';
      const docNumber = receipt.receiptNumber || 'Draft';
      document.title = `${companyName} ${docNumber}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, company?.name, receipt.receiptNumber]);

  // Add body class for print CSS isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('printing-receipt');
      return () => {
        document.body.classList.remove('printing-receipt');
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to get bank account name from ID
  const getBankAccountName = (receivedAt: string): string => {
    if (receivedAt === 'cash') return 'Cash';
    const account = effectiveBankAccounts.find((ba) => ba.id === receivedAt);
    if (account) {
      return `${account.bankInformation.bankName} (${account.accountNumber})`;
    }
    return receivedAt;
  };

  // Check if any line item has WHT
  const hasWht = receipt.lineItems.some(
    (item) => (typeof item.whtRate === 'number' && item.whtRate !== 0) || (item.whtRate === 'custom' && item.customWhtAmount)
  );

  // Calculate running index for line items across pages
  const getItemIndex = (pageIndex: number, itemIndex: number): number => {
    let count = 0;
    for (let i = 0; i < pageIndex; i++) {
      count += contentPages[i].length;
    }
    return count + itemIndex + 1;
  };

  // Render header section (reusable across pages)
  const renderHeader = (pageNumber: number) => (
    <div className="print-header">
      {/* Company & Document Title Row */}
      <div className="flex justify-between items-start">
        {/* Company Info */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {company?.name || 'Company Name'}
          </h1>
          {fieldSettings.showCompanyAddress && company?.registeredAddress && (
            <div className="mt-1 text-xs text-gray-600 space-y-0.5">
              <p>{company.registeredAddress.street}</p>
              <p>
                {company.registeredAddress.city}
                {company.registeredAddress.state && `, ${company.registeredAddress.state}`}{' '}
                {company.registeredAddress.postalCode}
              </p>
              <p>{company.registeredAddress.country}</p>
            </div>
          )}
          {company?.contactInformation && (
            <div className="mt-1 text-xs text-gray-600">
              {(fieldSettings.showCompanyPhone || fieldSettings.showCompanyEmail) && (
                <p>
                  {fieldSettings.showCompanyPhone && `Tel: ${company.contactInformation.phoneNumber}`}
                  {fieldSettings.showCompanyPhone && fieldSettings.showCompanyEmail && ' | '}
                  {fieldSettings.showCompanyEmail && `Email: ${company.contactInformation.email}`}
                </p>
              )}
            </div>
          )}
          {fieldSettings.showCompanyTaxId && company?.taxId && (
            <p className="mt-0.5 text-xs text-gray-600">Tax ID: {company.taxId}</p>
          )}
        </div>

        {/* Document Title & Page Number */}
        <div className="text-right">
          <h2 className="text-2xl font-bold tracking-wider text-gray-800">
            {company?.isVatRegistered ? 'RECEIPT / TAX RECEIPT' : 'RECEIPT'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Page {pageNumber}/{totalPages}</p>
        </div>
      </div>

      {/* Document Info & Client Info */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Client Info */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Received From
          </h3>
          <div className="text-xs text-gray-900">
            <p className="font-semibold text-sm">{clientName || 'Customer Name'}</p>
            {client?.contactPerson && <p>{client.contactPerson}</p>}
            {fieldSettings.showClientAddress && client?.billingAddress && (
              <div className="text-gray-600">
                {client.billingAddress.street && <p>{client.billingAddress.street}</p>}
                <p>
                  {client.billingAddress.city}
                  {client.billingAddress.state && `, ${client.billingAddress.state}`}{' '}
                  {client.billingAddress.postalCode}
                </p>
                {client.billingAddress.country && <p>{client.billingAddress.country}</p>}
              </div>
            )}
            {fieldSettings.showClientEmail && client?.email && <p className="text-gray-600">{client.email}</p>}
            {fieldSettings.showClientTaxId && client?.taxId && <p className="text-gray-600">Tax ID: {client.taxId}</p>}
          </div>
        </div>

        {/* Document Details */}
        <div className="text-right">
          <table className="ml-auto text-xs">
            <tbody>
              <tr>
                <td className="py-0.5 text-gray-500 pr-3">Receipt No:</td>
                <td className="py-0.5 font-semibold text-gray-900">
                  {receipt.receiptNumber || 'Draft'}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 text-gray-500 pr-3">Receipt Date:</td>
                <td className="py-0.5 text-gray-900">{formatDate(receipt.receiptDate)}</td>
              </tr>
              {receipt.reference && (
                <tr>
                  <td className="py-0.5 text-gray-500 pr-3">Reference:</td>
                  <td className="py-0.5 text-gray-900">{receipt.reference}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render footer section (only on last page)
  const renderFooter = () => (
    <div className="print-footer">
      {/* Totals - aligned right */}
      <div className="flex justify-end mb-3">
        <div className="w-72">
          <table className="w-full text-xs">
            <tbody>
              {fieldSettings.showSubtotal && (
                <tr>
                  <td className="py-1 text-gray-600">Subtotal:</td>
                  <td className="py-1 text-right text-gray-900">
                    {formatCurrency(receipt.subtotal, receipt.currency as any)}
                  </td>
                </tr>
              )}
              {fieldSettings.showVatAmount && receipt.pricingType !== 'no_vat' && (
                <tr>
                  <td className="py-1 text-gray-600">
                    VAT ({receipt.pricingType === 'include_vat' ? 'Included' : 'Added'}):
                  </td>
                  <td className="py-1 text-right text-gray-900">
                    {formatCurrency(receipt.taxAmount, receipt.currency as any)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-800">
                <td className="py-2 font-bold text-gray-900 text-sm">Total:</td>
                <td className="py-2 text-right font-bold text-gray-900 text-sm">
                  {formatCurrency(receipt.totalAmount, receipt.currency as any)}
                </td>
              </tr>
              {fieldSettings.showWhtAmount && receipt.whtAmount > 0 && (
                <>
                  <tr>
                    <td className="py-1 text-gray-600">Withholding Tax:</td>
                    <td className="py-1 text-right text-gray-900">
                      -{formatCurrency(receipt.whtAmount, receipt.currency as any)}
                    </td>
                  </tr>
                  {fieldSettings.showNetAmountToPay && receipt.netAmountToPay !== undefined && (
                    <tr className="border-t border-gray-300">
                      <td className="py-1 font-semibold text-gray-900">Net Amount to Pay:</td>
                      <td className="py-1 text-right font-semibold text-gray-900">
                        {formatCurrency(receipt.netAmountToPay, receipt.currency as any)}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Records Table */}
      {receipt.payments.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Payment Records
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-1 px-2 text-left font-semibold text-gray-700 w-8">#</th>
                <th className="py-1 px-2 text-left font-semibold text-gray-700 w-28">Date</th>
                <th className="py-1 px-2 text-left font-semibold text-gray-700">Received At</th>
                <th className="py-1 px-2 text-left font-semibold text-gray-700">Remark</th>
                <th className="py-1 px-2 text-right font-semibold text-gray-700 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.payments.map((payment, index) => (
                <tr key={payment.id} className="border-b border-gray-200">
                  <td className="py-1 px-2 text-gray-600">{index + 1}</td>
                  <td className="py-1 px-2 text-gray-900">{formatDate(payment.paymentDate)}</td>
                  <td className="py-1 px-2 text-gray-900">{getBankAccountName(payment.receivedAt)}</td>
                  <td className="py-1 px-2 text-gray-600">{payment.remark || '-'}</td>
                  <td className="py-1 px-2 text-right font-medium text-gray-900">
                    {formatCurrency(payment.amount, receipt.currency as any)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {fieldSettings.showTermsAndConditions && receipt.notes && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Notes
          </h3>
          <div className="text-xs text-gray-700 whitespace-pre-line line-clamp-3">
            {receipt.notes}
          </div>
        </div>
      )}

      {/* Signature */}
      {fieldSettings.showCreatedBySignature && (
        <div className="mt-3">
          <div className="w-40">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Received by
            </h3>
            <div className="border-b border-gray-400 mb-1 h-5"></div>
            <p className="text-xs text-gray-900">{createdBy || '___________________'}</p>
            <p className="text-xs text-gray-500">{formatDate(receipt.receiptDate)}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Render content table
  const renderContentTable = (pageItems: LineItem[], pageIndex: number) => (
    <div className="print-content">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-3 text-left font-semibold text-gray-700 w-10">#</th>
            <th className="py-2 px-3 text-left font-semibold text-gray-700">Description</th>
            <th className="py-2 px-3 text-center font-semibold text-gray-700 w-16">Qty</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-700 w-24">Unit Price</th>
            {fieldSettings.showVatColumn && receipt.pricingType !== 'no_vat' && (
              <th className="py-2 px-3 text-center font-semibold text-gray-700 w-16">VAT %</th>
            )}
            {fieldSettings.showWhtColumn && hasWht && (
              <th className="py-2 px-3 text-center font-semibold text-gray-700 w-16">WHT %</th>
            )}
            <th className="py-2 px-3 text-right font-semibold text-gray-700 w-24">Amount</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                No line items
              </td>
            </tr>
          ) : (
            pageItems.map((item, itemIndex) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2 px-3 text-gray-600">{getItemIndex(pageIndex, itemIndex)}</td>
                <td className="py-2 px-3 text-gray-900 whitespace-pre-line">{item.description}</td>
                <td className="py-2 px-3 text-center text-gray-900">{item.quantity}</td>
                <td className="py-2 px-3 text-right text-gray-900">
                  {formatCurrency(item.unitPrice, receipt.currency as any)}
                </td>
                {fieldSettings.showVatColumn && receipt.pricingType !== 'no_vat' && (
                  <td className="py-2 px-3 text-center text-gray-600">{item.taxRate}%</td>
                )}
                {fieldSettings.showWhtColumn && hasWht && (
                  <td className="py-2 px-3 text-center text-gray-600">
                    {item.whtRate !== 0 && item.whtRate !== 'custom'
                      ? `${item.whtRate}%`
                      : item.whtRate === 'custom' && item.customWhtAmount
                        ? formatCurrency(item.customWhtAmount, receipt.currency as any)
                        : '-'}
                  </td>
                )}
                <td className="py-2 px-3 text-right font-medium text-gray-900">
                  {formatCurrency(item.amount, receipt.currency as any)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const printContent = (
    <div className="print-portal fixed inset-0 z-[9999] overflow-auto bg-gray-900/50 print:bg-white print:static print:overflow-visible">
      {/* Print Controls - Hidden when printing */}
      <div className="print-controls sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Print Preview</h2>
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

      {/* Print Content - Multiple Pages */}
      <div className="bg-gray-100 py-8 print:bg-white print:py-0">
        {/* Render content pages */}
        {contentPages.map((pageItems, pageIndex) => {
          const isLastContentPage = pageIndex === contentPages.length - 1;
          const isLastPage = isLastContentPage && !needsSeparateFooterPage;
          const pageNumber = pageIndex + 1;

          return (
            <div key={pageIndex} className="print-page max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none mb-8 print:mb-0">
              {renderHeader(pageNumber)}
              {renderContentTable(pageItems, pageIndex)}
              {/* Footer only on last page when no separate footer page needed */}
              {isLastPage && renderFooter()}
            </div>
          );
        })}

        {/* Separate footer page if needed */}
        {needsSeparateFooterPage && (
          <div className="print-page max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none mb-8 print:mb-0">
            {renderHeader(totalPages)}
            <div className="print-content" />
            {renderFooter()}
          </div>
        )}
      </div>
    </div>
  );

  // Render to body using portal (outside #__next)
  return createPortal(printContent, document.body);
}
