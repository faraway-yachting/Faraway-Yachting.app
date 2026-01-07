'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import type { ExpenseRecord, ExpenseLineItem } from '@/data/expenses/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import { formatDate } from '@/lib/income/utils';
import { getProjectById } from '@/data/project/projects';

interface ExpensePrintViewProps {
  expense: ExpenseRecord;
  company: Company | undefined;
  vendor: Contact | undefined;
  createdBy?: string;
  approvedBy?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Format currency for expense (THB default)
function formatExpenseCurrency(amount: number, currency: string = 'THB'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

// Get project name by ID
function getProjectName(projectId: string): string {
  const project = getProjectById(projectId);
  return project?.name || '-';
}

export default function ExpensePrintView({
  expense,
  company,
  vendor,
  createdBy,
  approvedBy,
  isOpen,
  onClose,
}: ExpensePrintViewProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set document title for PDF filename: "Company ExpenseNumber"
  useEffect(() => {
    if (isOpen) {
      const originalTitle = document.title;
      const companyName = company?.name || 'Expense';
      const docNumber = expense.expenseNumber || 'Draft';
      document.title = `${companyName} ${docNumber}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, company?.name, expense.expenseNumber]);

  // Add body class for print CSS isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('printing-expense');
      return () => {
        document.body.classList.remove('printing-expense');
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  // Check if any line item has WHT
  const hasWht = expense.whtAmount > 0;

  // Check if any line item has VAT
  const hasVat = expense.vatAmount > 0;

  const printContent = (
    <div className="print-portal fixed inset-0 z-[9999] overflow-auto bg-gray-900/50 print:bg-white print:static print:overflow-visible">
      {/* Print Controls - Hidden when printing */}
      <div className="print-controls sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Print Preview</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
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
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none">
          {/* A4 Page */}
          <div className="p-10 print:p-8 min-h-[297mm] print:min-h-0">
            {/* Header / Letterhead - Light Blue Theme */}
            <div className="border-b-2 border-sky-600 pb-6 mb-6">
              <div className="flex justify-between items-start">
                {/* Company Info */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {company?.name || 'Company Name'}
                  </h1>
                  {company?.registeredAddress && (
                    <div className="mt-2 text-sm text-gray-600 space-y-0.5">
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
                    <div className="mt-2 text-sm text-gray-600">
                      <p>
                        Tel: {company.contactInformation.phoneNumber} | Email:{' '}
                        {company.contactInformation.email}
                      </p>
                    </div>
                  )}
                  {company?.taxId && (
                    <p className="mt-1 text-sm text-gray-600">Tax ID: {company.taxId}</p>
                  )}
                </div>

                {/* Document Title - Light Blue */}
                <div className="text-right">
                  <h2 className="text-3xl font-bold tracking-wider text-sky-700">
                    EXPENSE VOUCHER
                  </h2>
                </div>
              </div>
            </div>

            {/* Document Info & Vendor Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Vendor Info */}
              <div>
                <h3 className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-2">
                  Paid To
                </h3>
                <div className="text-sm text-gray-900">
                  <p className="font-semibold text-base">{expense.vendorName || vendor?.name || 'Vendor Name'}</p>
                  {vendor?.contactPerson && <p>{vendor.contactPerson}</p>}
                  {vendor?.billingAddress && (
                    <div className="mt-1 text-gray-600">
                      {vendor.billingAddress.street && <p>{vendor.billingAddress.street}</p>}
                      <p>
                        {vendor.billingAddress.city}
                        {vendor.billingAddress.state && `, ${vendor.billingAddress.state}`}{' '}
                        {vendor.billingAddress.postalCode}
                      </p>
                      {vendor.billingAddress.country && <p>{vendor.billingAddress.country}</p>}
                    </div>
                  )}
                  {vendor?.email && <p className="mt-1 text-gray-600">{vendor.email}</p>}
                  {vendor?.taxId && <p className="mt-1 text-gray-600">Tax ID: {vendor.taxId}</p>}
                </div>
              </div>

              {/* Document Details */}
              <div className="text-right">
                <table className="ml-auto text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-500 pr-4">Expense No:</td>
                      <td className="py-1 font-semibold text-gray-900">
                        {expense.expenseNumber || 'Draft'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-500 pr-4">Expense Date:</td>
                      <td className="py-1 text-gray-900">{formatDate(expense.expenseDate)}</td>
                    </tr>
                    {expense.dueDate && (
                      <tr>
                        <td className="py-1 text-gray-500 pr-4">Due Date:</td>
                        <td className="py-1 text-gray-900">{formatDate(expense.dueDate)}</td>
                      </tr>
                    )}
                    {expense.supplierInvoiceNumber && (
                      <tr>
                        <td className="py-1 text-gray-500 pr-4">Supplier Invoice:</td>
                        <td className="py-1 text-gray-900">{expense.supplierInvoiceNumber}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line Items Table - Light Blue Theme */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-100">
                    <th className="py-3 px-4 text-left font-semibold text-sky-800 w-12">#</th>
                    <th className="py-3 px-4 text-left font-semibold text-sky-800">Description</th>
                    <th className="py-3 px-4 text-left font-semibold text-sky-800 w-28">Project</th>
                    <th className="py-3 px-4 text-center font-semibold text-sky-800 w-16">Qty</th>
                    <th className="py-3 px-4 text-right font-semibold text-sky-800 w-28">
                      Unit Price
                    </th>
                    {hasVat && expense.pricingType !== 'no_vat' && (
                      <th className="py-3 px-4 text-center font-semibold text-sky-800 w-16">
                        VAT %
                      </th>
                    )}
                    {hasWht && (
                      <th className="py-3 px-4 text-center font-semibold text-sky-800 w-16">
                        WHT %
                      </th>
                    )}
                    <th className="py-3 px-4 text-right font-semibold text-sky-800 w-28">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expense.lineItems
                    .filter((item) => item.description.trim() !== '' || item.unitPrice > 0)
                    .map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                        <td className="py-3 px-4 text-gray-900">{item.description}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {getProjectName(item.projectId)}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatExpenseCurrency(item.unitPrice, expense.currency)}
                        </td>
                        {hasVat && expense.pricingType !== 'no_vat' && (
                          <td className="py-3 px-4 text-center text-gray-600">{item.taxRate}%</td>
                        )}
                        {hasWht && (
                          <td className="py-3 px-4 text-center text-gray-600">
                            {item.whtRate !== 0 && item.whtRate !== 'custom'
                              ? `${item.whtRate}%`
                              : item.whtRate === 'custom' && item.customWhtAmount
                                ? formatExpenseCurrency(item.customWhtAmount, expense.currency)
                                : '-'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatExpenseCurrency(item.amount, expense.currency)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Totals - Light Blue accent */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2 text-gray-600">Subtotal:</td>
                      <td className="py-2 text-right text-gray-900">
                        {formatExpenseCurrency(expense.subtotal, expense.currency)}
                      </td>
                    </tr>
                    {hasVat && expense.pricingType !== 'no_vat' && (
                      <tr>
                        <td className="py-2 text-gray-600">
                          VAT ({expense.pricingType === 'include_vat' ? 'Included' : 'Added'}):
                        </td>
                        <td className="py-2 text-right text-gray-900">
                          {formatExpenseCurrency(expense.vatAmount, expense.currency)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-sky-600">
                      <td className="py-3 font-bold text-gray-900 text-base">Total:</td>
                      <td className="py-3 text-right font-bold text-gray-900 text-base">
                        {formatExpenseCurrency(expense.totalAmount, expense.currency)}
                      </td>
                    </tr>
                    {hasWht && (
                      <>
                        <tr>
                          <td className="py-2 text-gray-600">Withholding Tax:</td>
                          <td className="py-2 text-right text-gray-900">
                            -{formatExpenseCurrency(expense.whtAmount, expense.currency)}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-300">
                          <td className="py-2 font-semibold text-gray-900">Net Payable:</td>
                          <td className="py-2 text-right font-semibold text-gray-900">
                            {formatExpenseCurrency(expense.netPayable, expense.currency)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {expense.notes && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <div className="text-sm text-gray-700 whitespace-pre-line p-4 bg-sky-50 rounded-lg">
                  {expense.notes}
                </div>
              </div>
            )}

            {/* Signatures - Dual signature lines */}
            <div className="mt-12 pt-8">
              <div className="grid grid-cols-2 gap-16">
                {/* Created By */}
                <div>
                  <h3 className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-8">
                    Prepared by
                  </h3>
                  <div className="border-b border-gray-400 mb-2 h-8"></div>
                  <p className="text-sm text-gray-900">{createdBy || expense.createdBy || '___________________'}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(expense.createdAt)}</p>
                </div>

                {/* Approved By */}
                <div>
                  <h3 className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-8">
                    Approved by
                  </h3>
                  <div className="border-b border-gray-400 mb-2 h-8"></div>
                  <p className="text-sm text-gray-900">{approvedBy || expense.approvedBy || '___________________'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {expense.approvedDate ? formatDate(expense.approvedDate) : '___________________'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render to body using portal (outside #__next)
  return createPortal(printContent, document.body);
}
