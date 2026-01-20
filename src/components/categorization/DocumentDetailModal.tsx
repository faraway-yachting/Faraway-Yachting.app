'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Calendar, Building2, User, DollarSign, RefreshCw, ExternalLink } from 'lucide-react';
import { expensesApi, type ExpenseWithDetails } from '@/lib/supabase/api';
import { receiptsApi, type ReceiptWithDetails } from '@/lib/supabase/api/receipts';
import { getAccountByCode } from '@/components/accounting/AccountCodeSelector';

interface DocumentDetailModalProps {
  documentType: 'receipt' | 'expense';
  documentId: string;
  documentNumber: string;
  onClose: () => void;
}

type StatusBadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

const statusColors: Record<string, StatusBadgeColor> = {
  // Receipt statuses
  draft: 'gray',
  paid: 'green',
  void: 'red',
  // Expense statuses
  approved: 'green',
  pending: 'yellow',
};

const paymentStatusColors: Record<string, StatusBadgeColor> = {
  unpaid: 'yellow',
  partially_paid: 'blue',
  paid: 'green',
};

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = statusColors[status] || 'gray';
  const colorClasses: Record<StatusBadgeColor, string> = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {label || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const color = paymentStatusColors[status] || 'gray';
  const colorClasses: Record<StatusBadgeColor, string> = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DocumentDetailModal({
  documentType,
  documentId,
  documentNumber,
  onClose,
}: DocumentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseWithDetails | null>(null);
  const [receipt, setReceipt] = useState<ReceiptWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (documentType === 'expense') {
          const data = await expensesApi.getByIdWithDetails(documentId);
          setExpense(data);
        } else {
          const data = await receiptsApi.getByIdWithDetails(documentId);
          setReceipt(data);
        }
      } catch (err) {
        console.error('Failed to fetch document:', err);
        setError('Failed to load document details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentType, documentId]);

  // Get detail page link
  const getDetailLink = () => {
    if (documentType === 'expense') {
      return `/accounting/manager/expenses/expense-records/${documentId}`;
    }
    return `/accounting/manager/income/receipts/${documentId}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${documentType === 'receipt' ? 'bg-green-100' : 'bg-orange-100'}`}>
              <FileText className={`h-5 w-5 ${documentType === 'receipt' ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{documentNumber}</h3>
              <p className="text-sm text-gray-500">
                {documentType === 'receipt' ? 'Receipt' : 'Expense'} Details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Loading document...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : documentType === 'expense' && expense ? (
            <ExpenseDetails expense={expense} />
          ) : documentType === 'receipt' && receipt ? (
            <ReceiptDetails receipt={receipt} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Document not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <a
            href={getDetailLink()}
            className="flex items-center gap-2 text-sm text-[#5A7A8F] hover:text-[#4a6a7f] font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            Open Full Details
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseDetails({ expense }: { expense: ExpenseWithDetails }) {
  return (
    <div className="space-y-6">
      {/* Status and Basic Info */}
      <div className="flex flex-wrap gap-4 items-center">
        <StatusBadge status={expense.status} />
        {expense.payment_status && (
          <PaymentStatusBadge status={expense.payment_status} />
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Expense Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(expense.expense_date)}</p>
          </div>
        </div>
        {expense.due_date && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Due Date</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(expense.due_date)}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Vendor</p>
            <p className="text-sm font-medium text-gray-900">{expense.vendor_name || '-'}</p>
          </div>
        </div>
        {expense.supplier_invoice_number && (
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Supplier Invoice #</p>
              <p className="text-sm font-medium text-gray-900">{expense.supplier_invoice_number}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Company</p>
            <p className="text-sm font-medium text-gray-900">
              {expense.company_id}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Line Items</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expense.line_items?.map((item) => {
                const account = item.account_code ? getAccountByCode(item.account_code) : null;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {account ? `${account.code} - ${account.name}` : (item.account_code || '-')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.amount || 0, expense.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">{formatCurrency(expense.subtotal || 0, expense.currency)}</span>
          </div>
          {(expense.vat_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT</span>
              <span className="font-medium text-gray-900">{formatCurrency(expense.vat_amount || 0, expense.currency)}</span>
            </div>
          )}
          {(expense.wht_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">WHT</span>
              <span className="font-medium text-red-600">-{formatCurrency(expense.wht_amount || 0, expense.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-900">Total Amount</span>
            <span className="font-bold text-gray-900">{formatCurrency(expense.total_amount || 0, expense.currency)}</span>
          </div>
          {(expense.wht_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">Net Payable</span>
              <span className="font-bold text-[#5A7A8F]">{formatCurrency(expense.net_payable || 0, expense.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {expense.notes && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{expense.notes}</p>
        </div>
      )}
    </div>
  );
}

function ReceiptDetails({ receipt }: { receipt: ReceiptWithDetails }) {
  // Type assertion for fields that might not be in base type
  const receiptData = receipt as ReceiptWithDetails & {
    charter_date_from?: string | null;
    charter_date_to?: string | null;
    charter_type?: string | null;
    line_items?: Array<{
      id: string;
      description?: string | null;
      amount?: number | null;
      account_code?: string | null;
    }>;
  };

  return (
    <div className="space-y-6">
      {/* Status and Basic Info */}
      <div className="flex flex-wrap gap-4 items-center">
        <StatusBadge status={receipt.status} />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Receipt Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(receipt.receipt_date)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Client</p>
            <p className="text-sm font-medium text-gray-900">{receipt.client_name || '-'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500">Company</p>
            <p className="text-sm font-medium text-gray-900">
              {receipt.company_id}
            </p>
          </div>
        </div>
        {receiptData.charter_type && (
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Charter Type</p>
              <p className="text-sm font-medium text-gray-900">
                {receiptData.charter_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
            </div>
          </div>
        )}
        {(receiptData.charter_date_from || receiptData.charter_date_to) && (
          <div className="flex items-start gap-3 col-span-2">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Charter Period</p>
              <p className="text-sm font-medium text-gray-900">
                {receiptData.charter_date_from ? formatDate(receiptData.charter_date_from) : '-'}
                {' → '}
                {receiptData.charter_date_to ? formatDate(receiptData.charter_date_to) : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      {receiptData.line_items && receiptData.line_items.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Line Items</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receiptData.line_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">-</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(item.amount || 0, receipt.currency)}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">{formatCurrency(receipt.subtotal || 0, receipt.currency)}</span>
          </div>
          {receipt.tax_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT</span>
              <span className="font-medium text-gray-900">{formatCurrency(receipt.tax_amount, receipt.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-900">Total Amount</span>
            <span className="font-bold text-gray-900">{formatCurrency(receipt.total_amount || 0, receipt.currency)}</span>
          </div>
          {(receipt.total_received ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Received</span>
              <span className="font-medium text-green-600">{formatCurrency(receipt.total_received || 0, receipt.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {receipt.notes && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{receipt.notes}</p>
        </div>
      )}
    </div>
  );
}
