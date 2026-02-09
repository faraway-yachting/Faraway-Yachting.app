'use client';

import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Download, ExternalLink, Calendar } from 'lucide-react';
import { BankAccountCoverage } from '@/data/banking/bankReconciliationTypes';
import { useIsMobile } from '@/hooks/useIsMobile';

interface BankAccountCoverageTableProps {
  accounts: BankAccountCoverage[];
  onAccountClick: (accountId: string) => void;
  onDownloadStatement: (accountId: string) => void;
  onOpenAccountDetails: (accountId: string) => void;
}

export function BankAccountCoverageTable({
  accounts,
  onAccountClick,
  onDownloadStatement,
  onOpenAccountDetails,
}: BankAccountCoverageTableProps) {
  // Group accounts by company
  const accountsByCompany = accounts.reduce((acc, account) => {
    const companyName = account.companyName;
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(account);
    return acc;
  }, {} as Record<string, BankAccountCoverage[]>);

  const getFeedStatusIcon = (status: 'active' | 'broken' | 'manual') => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'broken':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'manual':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFeedStatusBadge = (status: 'active' | 'broken' | 'manual') => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      broken: 'bg-red-100 text-red-800',
      manual: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {getFeedStatusIcon(status)}
        {status === 'active' ? 'Active' : status === 'broken' ? 'Broken' : 'Manual'}
      </span>
    );
  };

  const getCurrencyBadge = (currency: string) => {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        {currency}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getReconciliationColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-green-600';
    if (percentage >= 80) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-gray-200 bg-white">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts</h3>
            <p className="mt-1 text-sm text-gray-500">No bank accounts match the current filters.</p>
          </div>
        ) : (
          Object.entries(accountsByCompany).map(([companyName, companyAccounts]) => (
            <div key={`company-group-${companyName}`}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
                {companyName}
              </div>
              <div className="space-y-3">
                {companyAccounts.map((account) => (
                  <div
                    key={account.bankAccountId}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer active:bg-gray-50"
                    onClick={() => onAccountClick(account.bankAccountId)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{account.bankAccountName}</span>
                      {getCurrencyBadge(account.currency)}
                    </div>
                    <dl className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <dt className="shrink-0 text-xs font-medium text-gray-500">Feed</dt>
                        <dd className="text-right">{getFeedStatusBadge(account.feedStatus)}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="shrink-0 text-xs font-medium text-gray-500">Last Import</dt>
                        <dd className="text-right text-sm text-gray-900">{formatDate(account.lastImportDate)}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="shrink-0 text-xs font-medium text-gray-500">Lines</dt>
                        <dd className="text-right text-sm text-gray-900">
                          {account.totalLinesInRange} total · {account.matchedLines} matched · {account.unmatchedLines} unmatched
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="shrink-0 text-xs font-medium text-gray-500">Reconciled</dt>
                        <dd className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full ${getReconciliationColor(account.reconciledPercentage)}`}
                              style={{ width: `${account.reconciledPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{account.reconciledPercentage.toFixed(0)}%</span>
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="shrink-0 text-xs font-medium text-gray-500">Net Diff</dt>
                        <dd className={`text-right text-sm font-semibold ${
                          account.netDifference === 0 ? 'text-green-600' :
                          Math.abs(account.netDifference) < 100 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatAmount(account.netDifference, account.currency)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDownloadStatement(account.bankAccountId)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Statement
                      </button>
                      <button
                        onClick={() => onOpenAccountDetails(account.bankAccountId)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bank Account
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Currency
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feed Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Import
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lines
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Matched
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unmatched
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reconciled
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Difference
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(accountsByCompany).map(([companyName, companyAccounts]) => (
              <React.Fragment key={`company-group-${companyName}`}>
                {/* Company header row */}
                <tr className="bg-gray-50">
                  <td colSpan={10} className="px-4 py-2 text-sm font-semibold text-gray-700">
                    {companyName}
                  </td>
                </tr>

                {/* Account rows */}
                {companyAccounts.map((account) => (
                  <tr
                    key={account.bankAccountId}
                    onClick={() => onAccountClick(account.bankAccountId)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {/* Bank Account Name */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{account.bankAccountName}</div>
                    </td>

                    {/* Currency */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getCurrencyBadge(account.currency)}
                    </td>

                    {/* Feed Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getFeedStatusBadge(account.feedStatus)}
                    </td>

                    {/* Last Import */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {formatDate(account.lastImportDate)}
                      </div>
                      {account.lastImportSource && (
                        <div className="text-xs text-gray-500">via {account.lastImportSource}</div>
                      )}
                    </td>

                    {/* Lines in Range */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{account.totalLinesInRange}</div>
                    </td>

                    {/* Matched Lines */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">{account.matchedLines}</span>
                      </div>
                    </td>

                    {/* Unmatched Lines */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                        <span className="text-sm font-medium text-gray-900">{account.unmatchedLines}</span>
                      </div>
                      {account.missingRecordLines > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span className="text-xs text-red-600">{account.missingRecordLines} missing</span>
                        </div>
                      )}
                    </td>

                    {/* Reconciliation Percentage */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[80px]">
                          <div
                            className={`h-2 rounded-full transition-all ${getReconciliationColor(
                              account.reconciledPercentage
                            )}`}
                            style={{ width: `${account.reconciledPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-10 text-right">
                          {account.reconciledPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Net Difference */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div
                        className={`text-sm font-semibold ${
                          account.netDifference === 0
                            ? 'text-green-600'
                            : Math.abs(account.netDifference) < 100
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatAmount(account.netDifference, account.currency)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadStatement(account.bankAccountId);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Download bank statement"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAccountDetails(account.bankAccountId);
                          }}
                          className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                          title="Open bank account details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts</h3>
          <p className="mt-1 text-sm text-gray-500">
            No bank accounts match the current filters.
          </p>
        </div>
      )}
    </div>
  );
}
