'use client';

import { useState } from 'react';
import {
  Plus,
  X,
  Check,
  AlertCircle,
  Lightbulb,
  FileText,
  DollarSign,
  Calendar,
  User,
  History,
  Paperclip,
} from 'lucide-react';
import {
  BankFeedLine,
  BankMatch,
  SuggestedMatch,
  TransactionType,
} from '@/data/banking/bankReconciliationTypes';

interface MatchWorkbenchProps {
  selectedLine?: BankFeedLine;
  suggestedMatches: SuggestedMatch[];
  onCreateMatch: (match: Partial<BankMatch>) => void;
  onRemoveMatch: (matchId: string) => void;
  onAcceptSuggestion: (suggestion: SuggestedMatch) => void;
  onCreateNew: (transactionType: TransactionType) => void;
}

export function MatchWorkbench({
  selectedLine,
  suggestedMatches,
  onCreateMatch,
  onRemoveMatch,
  onAcceptSuggestion,
  onCreateNew,
}: MatchWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'match' | 'details'>('match');

  if (!selectedLine) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
        <div className="text-center px-4">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No transaction selected</h3>
          <p className="text-xs text-gray-500 mt-1">
            Select a bank transaction from the list to start matching.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const remainingAmount = Math.abs(selectedLine.amount) - selectedLine.matchedAmount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Left Panel: Match/Create */}
      <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Match or Create</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Match to existing records or create new entries
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Transaction Summary */}
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{selectedLine.description}</p>
                {selectedLine.reference && (
                  <p className="text-xs text-gray-600 mt-0.5">Ref: {selectedLine.reference}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <div className={`text-lg font-bold ${selectedLine.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatAmount(selectedLine.amount, selectedLine.currency)}
                </div>
                <div className="text-xs text-gray-600">{formatDate(selectedLine.transactionDate)}</div>
              </div>
            </div>

            {/* Match progress */}
            {selectedLine.matchedAmount > 0 && (
              <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Matched</span>
                  <span className="font-medium text-gray-900">
                    {formatAmount(selectedLine.matchedAmount, selectedLine.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Remaining</span>
                  <span className={`font-medium ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatAmount(remainingAmount, selectedLine.currency)}
                  </span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(selectedLine.matchedAmount / Math.abs(selectedLine.amount)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Existing Matches */}
          {selectedLine.matches.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Current Matches ({selectedLine.matches.length})
              </h4>
              <div className="space-y-2">
                {selectedLine.matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-green-800 uppercase">
                          {match.systemRecordType}
                        </span>
                        <span className="text-xs text-gray-600">{match.systemRecordId}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(match.matchedAmount, selectedLine.currency)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Matched by {match.matchedBy} • {match.matchMethod}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveMatch(match.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove match"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Matches */}
          {suggestedMatches.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                Suggested Matches ({suggestedMatches.length})
              </h4>
              <div className="space-y-2">
                {suggestedMatches.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-yellow-800 uppercase">
                            {suggestion.systemRecordType}
                          </span>
                          <span className="text-xs text-gray-600">{suggestion.reference}</span>
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getMatchScoreColor(
                              suggestion.matchScore
                            )}`}
                          >
                            {suggestion.matchScore}%
                          </span>
                        </div>
                        {suggestion.counterparty && (
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {suggestion.counterparty}
                          </div>
                        )}
                        <div className="text-sm text-gray-700">
                          {formatAmount(suggestion.amount, selectedLine.currency)} •{' '}
                          {formatDate(suggestion.date)}
                        </div>
                        {suggestion.description && (
                          <div className="text-xs text-gray-600 mt-1">{suggestion.description}</div>
                        )}
                      </div>
                    </div>

                    {/* Match reasons */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {suggestion.matchReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-gray-700 border border-yellow-300"
                        >
                          {reason.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => onAcceptSuggestion(suggestion)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#5A7A8F] hover:bg-[#2c3e50] rounded transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Accept Match
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Create New Record
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onCreateNew('receipt')}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
                Receipt
              </button>
              <button
                onClick={() => onCreateNew('expense')}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
                Expense
              </button>
              <button
                onClick={() => onCreateNew('transfer')}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
                Transfer
              </button>
              <button
                onClick={() => onCreateNew('owner_contribution')}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
                Owner
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Details & Audit */}
      <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'match'
                ? 'text-[#5A7A8F] border-b-2 border-[#5A7A8F] bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Match Details
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-[#5A7A8F] border-b-2 border-[#5A7A8F] bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Transaction Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'match' ? (
            <div className="space-y-4">
              {/* Match Summary */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Match Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Matches:</span>
                    <span className="font-medium text-gray-900">{selectedLine.matches.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Matched Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatAmount(selectedLine.matchedAmount, selectedLine.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span
                      className={`font-medium ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}
                    >
                      {formatAmount(remainingAmount, selectedLine.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Trail */}
              {(selectedLine.matchedAt || selectedLine.ignoredAt) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Audit Trail
                  </h4>
                  <div className="space-y-3">
                    {selectedLine.matchedAt && (
                      <div className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 font-medium">Matched</div>
                          <div className="text-gray-600 text-xs">
                            by {selectedLine.matchedBy} • {formatDate(selectedLine.matchedAt)}
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedLine.ignoredAt && (
                      <div className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 font-medium">Ignored</div>
                          <div className="text-gray-600 text-xs">
                            by {selectedLine.ignoredBy} • {formatDate(selectedLine.ignoredAt)}
                          </div>
                          {selectedLine.ignoredReason && (
                            <div className="text-gray-600 text-xs mt-1 italic">
                              "{selectedLine.ignoredReason}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                      <div className="flex-1">
                        <div className="text-gray-900 font-medium">Imported</div>
                        <div className="text-gray-600 text-xs">
                          by {selectedLine.importedBy} • {formatDate(selectedLine.importedAt)}
                        </div>
                        <div className="text-gray-600 text-xs">via {selectedLine.importSource}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedLine.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Notes
                  </h4>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                    {selectedLine.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Transaction Details */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Transaction Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600">Description</label>
                    <div className="text-sm text-gray-900 mt-1">{selectedLine.description}</div>
                  </div>

                  {selectedLine.reference && (
                    <div>
                      <label className="text-xs text-gray-600">Reference</label>
                      <div className="text-sm text-gray-900 mt-1">{selectedLine.reference}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Transaction Date</label>
                      <div className="text-sm text-gray-900 mt-1">
                        {formatDate(selectedLine.transactionDate)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Value Date</label>
                      <div className="text-sm text-gray-900 mt-1">{formatDate(selectedLine.valueDate)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Amount</label>
                      <div
                        className={`text-sm font-medium mt-1 ${
                          selectedLine.amount >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {formatAmount(selectedLine.amount, selectedLine.currency)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Currency</label>
                      <div className="text-sm text-gray-900 mt-1">{selectedLine.currency}</div>
                    </div>
                  </div>

                  {selectedLine.runningBalance !== undefined && (
                    <div>
                      <label className="text-xs text-gray-600">Running Balance</label>
                      <div className="text-sm text-gray-900 mt-1">
                        {formatAmount(selectedLine.runningBalance, selectedLine.currency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments */}
              {selectedLine.attachments && selectedLine.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({selectedLine.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedLine.attachments.map((attachment) => (
                      <a
                        key={attachment}
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded border border-gray-200 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        View Attachment
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
