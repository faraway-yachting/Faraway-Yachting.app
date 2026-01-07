'use client';

import { useState, useRef } from 'react';
import { X, Download, Upload, RefreshCw, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { BankAccount } from '@/data/banking/types';
import { getCompanyById } from '@/data/company/companies';
import { syncBankFeed, syncAllBankFeeds, getBankFeedStatus, getLastImportDate } from '@/data/banking/bankFeedAPI';
import { parseCSV, CSVImportResult } from '@/utils/banking/csvImport';

interface ImportSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccountsInScope: BankAccount[];
  onImportComplete: () => void;
}

interface AccountSyncState {
  accountId: string;
  syncing: boolean;
  uploading: boolean;
  result?: {
    success: boolean;
    message: string;
    newLines?: number;
  };
}

export function ImportSyncModal({
  isOpen,
  onClose,
  bankAccountsInScope,
  onImportComplete,
}: ImportSyncModalProps) {
  const [syncStates, setSyncStates] = useState<Record<string, AccountSyncState>>({});
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVImportResult | null>(null);
  const [selectedAccountForUpload, setSelectedAccountForUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get accounts with their feed statuses
  const accountsWithStatus = bankAccountsInScope.map(account => ({
    account,
    feedStatus: getBankFeedStatus(account.id),
    lastImport: getLastImportDate(account.id),
    company: getCompanyById(account.companyId),
  }));

  const activeFeeds = accountsWithStatus.filter(a => a.feedStatus === 'active');

  const handleSyncAccount = async (accountId: string) => {
    setSyncStates(prev => ({
      ...prev,
      [accountId]: { accountId, syncing: true, uploading: false },
    }));

    try {
      const result = await syncBankFeed(accountId);

      setSyncStates(prev => ({
        ...prev,
        [accountId]: {
          accountId,
          syncing: false,
          uploading: false,
          result: {
            success: result.success,
            message: result.success
              ? `Successfully imported ${result.newLines} new transaction${result.newLines !== 1 ? 's' : ''}`
              : result.errors?.join(', ') || 'Sync failed',
            newLines: result.newLines,
          },
        },
      }));

      if (result.success && result.newLines > 0) {
        // Auto-refresh after successful import
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error) {
      setSyncStates(prev => ({
        ...prev,
        [accountId]: {
          accountId,
          syncing: false,
          uploading: false,
          result: {
            success: false,
            message: error instanceof Error ? error.message : 'Sync failed',
          },
        },
      }));
    }
  };

  const handleSyncAll = async () => {
    setBulkSyncing(true);
    const accountIds = activeFeeds.map(a => a.account.id);

    // Initialize all states
    const initialStates: Record<string, AccountSyncState> = {};
    accountIds.forEach(id => {
      initialStates[id] = { accountId: id, syncing: true, uploading: false };
    });
    setSyncStates(initialStates);

    try {
      const result = await syncAllBankFeeds(accountIds);

      // Update all states with results
      const newStates: Record<string, AccountSyncState> = {};
      result.results.forEach(r => {
        newStates[r.bankAccountId] = {
          accountId: r.bankAccountId,
          syncing: false,
          uploading: false,
          result: {
            success: r.success,
            message: r.success
              ? `Imported ${r.newLines} transaction${r.newLines !== 1 ? 's' : ''}`
              : r.errors?.join(', ') || 'Failed',
            newLines: r.newLines,
          },
        };
      });
      setSyncStates(newStates);

      if (result.totalNewLines > 0) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error) {
      // Mark all as failed
      const failedStates: Record<string, AccountSyncState> = {};
      accountIds.forEach(id => {
        failedStates[id] = {
          accountId: id,
          syncing: false,
          uploading: false,
          result: {
            success: false,
            message: 'Bulk sync failed',
          },
        };
      });
      setSyncStates(failedStates);
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleUploadClick = (accountId: string) => {
    setSelectedAccountForUpload(accountId);
    setUploadResult(null);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAccountForUpload) return;

    const account = bankAccountsInScope.find(a => a.id === selectedAccountForUpload);
    if (!account) return;

    setSyncStates(prev => ({
      ...prev,
      [selectedAccountForUpload]: {
        accountId: selectedAccountForUpload,
        syncing: false,
        uploading: true,
      },
    }));

    try {
      const result = await parseCSV(
        file,
        account.id,
        account.companyId,
        account.currency
      );

      setUploadResult(result);

      setSyncStates(prev => ({
        ...prev,
        [selectedAccountForUpload]: {
          accountId: selectedAccountForUpload,
          syncing: false,
          uploading: false,
          result: {
            success: result.success,
            message: result.success
              ? `Successfully imported ${result.imported} transaction${result.imported !== 1 ? 's' : ''}${result.duplicates ? ` (${result.duplicates} duplicates found)` : ''}`
              : result.errors?.join(', ') || 'Upload failed',
            newLines: result.imported,
          },
        },
      }));

      if (result.success && result.imported && result.imported > 0) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (error) {
      setSyncStates(prev => ({
        ...prev,
        [selectedAccountForUpload]: {
          accountId: selectedAccountForUpload,
          syncing: false,
          uploading: false,
          result: {
            success: false,
            message: error instanceof Error ? error.message : 'Upload failed',
          },
        },
      }));
    }

    // Reset file input
    event.target.value = '';
  };

  const getFeedStatusBadge = (status: 'active' | 'broken' | 'manual') => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      broken: 'bg-red-100 text-red-800',
      manual: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      active: 'Active Feed',
      broken: 'Feed Broken',
      manual: 'Manual',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatLastImport = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import / Sync Bank Feeds</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sync API feeds or upload CSV statements
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Help Section - Download Example CSV */}
          <div className="px-6 py-3 border-b border-gray-200 bg-blue-50">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-900">
                  First time uploading? Download an example CSV template to see the required format.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a
                    href="/examples/bank-statement-example-single-amount.csv"
                    download
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Single Amount Column
                  </a>
                  <a
                    href="/examples/bank-statement-example-debit-credit.csv"
                    download
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Debit/Credit Columns
                  </a>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Required:</strong> Date, Description, Amount (or Debit/Credit) •
                  <strong className="ml-1">Optional:</strong> Reference, Balance •
                  <strong className="ml-1">Date formats:</strong> DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
                </p>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {activeFeeds.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <button
                onClick={handleSyncAll}
                disabled={bulkSyncing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing All Feeds...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync All Active Feeds ({activeFeeds.length})
                  </>
                )}
              </button>
            </div>
          )}

          {/* Account List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {accountsWithStatus.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No bank accounts found in current scope
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Feed Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Import
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountsWithStatus.map(({ account, feedStatus, lastImport, company }) => {
                      const state = syncStates[account.id];

                      return (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">{account.accountName}</div>
                            <div className="text-gray-500">{account.accountNumber}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {company?.name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                            {account.currency}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {getFeedStatusBadge(feedStatus)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatLastImport(lastImport)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {feedStatus === 'active' && (
                                <button
                                  onClick={() => handleSyncAccount(account.id)}
                                  disabled={state?.syncing || bulkSyncing}
                                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {state?.syncing ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Syncing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      Sync Now
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleUploadClick(account.id)}
                                disabled={state?.uploading || bulkSyncing}
                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {state?.uploading ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3" />
                                    Upload CSV
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Result Message */}
                            {state?.result && (
                              <div className={`mt-2 flex items-center justify-center gap-1 text-xs ${state.result.success ? 'text-green-600' : 'text-red-600'}`}>
                                {state.result.success ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                <span>{state.result.message}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{accountsWithStatus.length}</span> account{accountsWithStatus.length !== 1 ? 's' : ''} in scope
              {activeFeeds.length > 0 && (
                <>
                  {' • '}
                  <span className="font-medium">{activeFeeds.length}</span> active feed{activeFeeds.length !== 1 ? 's' : ''}
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
