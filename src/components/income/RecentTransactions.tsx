'use client';

import { Invoice, Quotation, Receipt } from '@/data/income/types';
import { FileText, Receipt as ReceiptIcon, FileSignature } from 'lucide-react';

interface RecentTransactionsProps {
  quotations: Quotation[];
  invoices: Invoice[];
  receipts: Receipt[];
}

type Transaction = {
  id: string;
  date: string;
  type: 'quotation' | 'invoice' | 'receipt';
  documentNumber: string;
  clientName: string;
  amount: number;
  status: string;
};

export function RecentTransactions({
  quotations,
  invoices,
  receipts,
}: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Combine all transactions and sort by date
  const allTransactions: Transaction[] = [
    ...quotations.map((q) => ({
      id: q.id,
      date: q.dateCreated,
      type: 'quotation' as const,
      documentNumber: q.quotationNumber,
      clientName: q.clientName,
      amount: q.totalAmount,
      status: q.status,
    })),
    ...invoices.map((i) => ({
      id: i.id,
      date: i.invoiceDate,
      type: 'invoice' as const,
      documentNumber: i.invoiceNumber,
      clientName: i.clientName,
      amount: i.totalAmount,
      status: i.status,
    })),
    ...receipts.map((r) => ({
      id: r.id,
      date: r.receiptDate,
      type: 'receipt' as const,
      documentNumber: r.receiptNumber,
      clientName: r.clientName,
      amount: r.totalReceived,
      status: r.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Take only the 5 most recent
  const recentTransactions = allTransactions.slice(0, 5);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quotation':
        return <FileSignature className="h-4 w-4" />;
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      case 'receipt':
        return <ReceiptIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      quotation: 'bg-blue-100 text-blue-800',
      invoice: 'bg-purple-100 text-purple-800',
      receipt: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string, type: string) => {
    // Status mapping for different document types
    const statusStyles: Record<string, string> = {
      // Quotation statuses
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-600',
      converted: 'bg-purple-100 text-purple-800',
      // Invoice statuses
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      void: 'bg-gray-100 text-gray-600',
      // Receipt statuses
      pending: 'bg-yellow-100 text-yellow-800',
      cleared: 'bg-blue-100 text-blue-800',
      reconciled: 'bg-green-100 text-green-800',
    };

    const statusLabels: Record<string, string> = {
      partially_paid: 'Partial',
      reconciled: '✓ Reconciled',
    };

    const label = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
    const style = statusStyles[status] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {recentTransactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatDate(transaction.date)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {getTypeBadge(transaction.type)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {transaction.documentNumber}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {transaction.clientName}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                {formatCurrency(transaction.amount)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {getStatusBadge(transaction.status, transaction.type)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {recentTransactions.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          No recent transactions
        </div>
      )}
    </div>
  );
}
