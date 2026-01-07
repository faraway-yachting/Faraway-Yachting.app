'use client';

import { useState, useMemo } from 'react';
import { X, Download, FileText, Receipt, ArrowRightLeft, Search } from 'lucide-react';
import { getExpectedBankMovement, ExpectedBankMovementRecord } from '@/data/banking/bankReconciliationData';

interface ExpectedBankMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateFrom: string;
  dateTo: string;
  companyId?: string;
  projectId?: string;
}

export function ExpectedBankMovementModal({
  isOpen,
  onClose,
  dateFrom,
  dateTo,
  companyId,
  projectId,
}: ExpectedBankMovementModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'invoice' | 'expense' | 'transfer'>('all');

  // Get data
  const allRecords = getExpectedBankMovement(dateFrom, dateTo, companyId, projectId);

  // Filter records
  const filteredRecords = useMemo(() => {
    let records = allRecords;

    // Filter by type
    if (selectedType !== 'all') {
      records = records.filter(r => r.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      records = records.filter(r =>
        r.reference.toLowerCase().includes(term) ||
        r.counterparty.toLowerCase().includes(term) ||
        r.notes?.toLowerCase().includes(term)
      );
    }

    return records;
  }, [allRecords, selectedType, searchTerm]);

  // Calculate stats
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0);
  const stats = {
    total: filteredRecords.length,
    invoices: filteredRecords.filter(r => r.type === 'invoice').length,
    expenses: filteredRecords.filter(r => r.type === 'expense').length,
    transfers: filteredRecords.filter(r => r.type === 'transfer').length,
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Reference', 'Counterparty', 'Amount', 'Currency', 'Project', 'Paid Date', 'Notes'];
    const rows = filteredRecords.map(r => [
      r.date,
      r.type,
      r.reference,
      r.counterparty,
      r.amount.toString(),
      r.currency,
      r.projectName || '-',
      r.paidDate || '-',
      r.notes || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expected-bank-movement-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: 'invoice' | 'expense' | 'transfer') => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <Receipt className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeBadge = (type: 'invoice' | 'expense' | 'transfer') => {
    const styles = {
      invoice: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      transfer: 'bg-blue-100 text-blue-800',
    };
    return styles[type];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Not in Bank</h2>
              <p className="text-sm text-gray-500 mt-1">
                Records marked as paid but not found in bank feed
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by reference, counterparty, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedType === 'all'
                        ? 'bg-[#5A7A8F] text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setSelectedType('invoice')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedType === 'invoice'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Invoices ({stats.invoices})
                  </button>
                  <button
                    onClick={() => setSelectedType('expense')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedType === 'expense'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Expenses ({stats.expenses})
                  </button>
                  <button
                    onClick={() => setSelectedType('transfer')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedType === 'transfer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Transfers ({stats.transfers})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content - Table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Try adjusting your search or filters'
                    : 'All system records are accounted for in the bank feed'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Counterparty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(record.type)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeBadge(record.type)}`}>
                              {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.reference}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.counterparty}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <span className={record.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {record.currency} {Math.abs(record.amount).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.projectName || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.paidDate ? new Date(record.paidDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredRecords.length}</span> record{filteredRecords.length !== 1 ? 's' : ''}
              {filteredRecords.length > 0 && (
                <>
                  {' • '}
                  <span className={`font-medium ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {Math.abs(totalAmount).toLocaleString()} THB
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {filteredRecords.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
