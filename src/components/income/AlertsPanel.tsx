'use client';

import { AlertCircle, Clock, FileText } from 'lucide-react';
import Link from 'next/link';

// Simplified types for alerts - only the fields we actually use
interface AlertInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amountOutstanding: number;
  dueDate: string;
}

interface AlertQuotation {
  id: string;
  quotationNumber: string;
  clientName: string;
  totalAmount: number;
  validUntil: string;
}

interface AlertReceipt {
  id: string;
  receiptNumber: string;
  clientName: string;
  totalReceived: number;
}

interface AlertsPanelProps {
  overdueInvoices: AlertInvoice[];
  expiringQuotations: AlertQuotation[];
  unreconciledReceipts: AlertReceipt[];
}

export function AlertsPanel({
  overdueInvoices,
  expiringQuotations,
  unreconciledReceipts,
}: AlertsPanelProps) {
  const totalAlerts = overdueInvoices.length + expiringQuotations.length + unreconciledReceipts.length;

  if (totalAlerts === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysOverdue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysUntilExpiry = (validUntil: string): number => {
    const today = new Date();
    const expiry = new Date(validUntil);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-amber-50 rounded-lg border-l-4 border-l-amber-500 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-900">
          Action Required ({totalAlerts})
        </h3>
      </div>

      <div className="space-y-2">
        {/* Overdue Invoices */}
        {overdueInvoices.length > 0 && (
          <div className="bg-white rounded p-3 border border-amber-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {overdueInvoices.slice(0, 2).map((invoice) => (
                  <div key={invoice.id} className="text-sm text-gray-600 ml-2">
                    • {invoice.invoiceNumber} • {invoice.clientName} • {formatCurrency(invoice.amountOutstanding)}
                    <span className="text-red-600 ml-1">
                      ({getDaysOverdue(invoice.dueDate)} days overdue)
                    </span>
                  </div>
                ))}
                {overdueInvoices.length > 2 && (
                  <div className="text-xs text-gray-500 ml-2 mt-1">
                    + {overdueInvoices.length - 2} more
                  </div>
                )}
              </div>
              <Link
                href="/accounting/manager/income/invoices?status=overdue"
                className="text-sm font-medium text-amber-700 hover:text-amber-900 ml-4"
              >
                View →
              </Link>
            </div>
          </div>
        )}

        {/* Expiring Quotations */}
        {expiringQuotations.length > 0 && (
          <div className="bg-white rounded p-3 border border-amber-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Expiring Soon
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {expiringQuotations.length} quotation{expiringQuotations.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {expiringQuotations.slice(0, 2).map((quotation) => (
                  <div key={quotation.id} className="text-sm text-gray-600 ml-2">
                    • {quotation.quotationNumber} • {quotation.clientName} • {formatCurrency(quotation.totalAmount)}
                    <span className="text-yellow-600 ml-1">
                      ({getDaysUntilExpiry(quotation.validUntil)} days remaining)
                    </span>
                  </div>
                ))}
                {expiringQuotations.length > 2 && (
                  <div className="text-xs text-gray-500 ml-2 mt-1">
                    + {expiringQuotations.length - 2} more
                  </div>
                )}
              </div>
              <Link
                href="/accounting/manager/income/quotations?status=sent"
                className="text-sm font-medium text-amber-700 hover:text-amber-900 ml-4"
              >
                View →
              </Link>
            </div>
          </div>
        )}

        {/* Unreconciled Receipts */}
        {unreconciledReceipts.length > 0 && (
          <div className="bg-white rounded p-3 border border-amber-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Unreconciled
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {unreconciledReceipts.length} receipt{unreconciledReceipts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {unreconciledReceipts.slice(0, 2).map((receipt) => (
                  <div key={receipt.id} className="text-sm text-gray-600 ml-2">
                    • {receipt.receiptNumber} • {receipt.clientName} • {formatCurrency(receipt.totalReceived)}
                  </div>
                ))}
                {unreconciledReceipts.length > 2 && (
                  <div className="text-xs text-gray-500 ml-2 mt-1">
                    + {unreconciledReceipts.length - 2} more
                  </div>
                )}
              </div>
              <Link
                href="/accounting/manager/income/receipts?status=pending"
                className="text-sm font-medium text-amber-700 hover:text-amber-900 ml-4"
              >
                View →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
