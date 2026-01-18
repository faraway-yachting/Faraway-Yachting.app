"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { ReconciliationScopeBar } from "@/components/banking/ReconciliationScopeBar";
import { CoverageCards } from "@/components/banking/CoverageCards";
import { BankAccountCoverageTable } from "@/components/banking/BankAccountCoverageTable";
import { BankFeedList } from "@/components/banking/BankFeedList";
import { MatchWorkbench } from "@/components/banking/MatchWorkbench";
import { ExpectedBankMovementModal } from "@/components/banking/ExpectedBankMovementModal";
import { DiscrepancyDrilldownModal } from "@/components/banking/DiscrepancyDrilldownModal";
import { ImportSyncModal } from "@/components/banking/ImportSyncModal";
import { ExportOptionsModal } from "@/components/banking/ExportOptionsModal";
import { FilterInfoBanner } from "@/components/banking/FilterInfoBanner";
import { CreateTransactionModal } from "@/components/banking/CreateTransactionModal";
import {
  mockBankFeedLines,
  mockBankAccountCoverage,
  getReconciliationStats,
  parseDataScope,
  filterBankAccountsByScope,
  filterBankLinesByScope,
  getActiveMatchingRules,
  getDynamicSuggestedMatches,
  createBankMatch,
  removeBankMatch,
  ignoreBankFeedLine,
  updateSuggestionsFromMatchingEngine,
  applyAutoMatches,
} from "@/data/banking/bankReconciliationData";
import { getAllCompanies } from "@/data/company/companies";
import { getAllBankAccounts } from "@/data/banking/bankAccounts";
import { getAllProjects } from "@/data/banking/projects";
import { getAllReceipts } from "@/data/income/receipts";
import { Currency } from "@/data/company/types";
import {
  ViewMode,
  BankFeedStatus,
  TransactionType,
  BankMatch,
  SuggestedMatch,
} from "@/data/banking/bankReconciliationTypes";
import {
  autoMatchBankLines,
  generateSuggestedMatches,
  createMatchFromSuggestion,
  getUnreconciledReceiptsAsSystemRecords,
  SystemRecord,
} from "@/lib/banking/matchingEngine";

export default function BankReconciliationPage() {
  // Scope bar state
  const [dataScope, setDataScope] = useState("all-companies");
  // Default date range: 1 year from today
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const [dateFrom, setDateFrom] = useState(oneYearAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [selectedBankAccountIds, setSelectedBankAccountIds] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Currency[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<BankFeedStatus[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("bank-first");
  const [showUnassignedLines, setShowUnassignedLines] = useState(true);

  // Selection state
  const [selectedLineId, setSelectedLineId] = useState<string | undefined>();

  // Modal state
  const [showExpectedBankMovementModal, setShowExpectedBankMovementModal] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showImportSyncModal, setShowImportSyncModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [createTransactionModal, setCreateTransactionModal] = useState<{
    isOpen: boolean;
    type: TransactionType | null;
  }>({ isOpen: false, type: null });

  // Refresh trigger for re-rendering after data changes
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Get data
  const companies = getAllCompanies();
  const allBankAccounts = getAllBankAccounts();
  const allProjects = getAllProjects();

  // Format projects for dropdown
  const projects = allProjects.map(p => ({
    id: p.id,
    name: p.name,
  }));

  // Parse data scope to determine filtering universe
  const scopeFilter = parseDataScope(dataScope);

  // Filter bank accounts by scope FIRST (defines available accounts)
  const bankAccountsInScope = filterBankAccountsByScope(allBankAccounts, scopeFilter, allProjects);

  // Transform bank accounts to match expected format
  const bankAccounts = bankAccountsInScope.map((account) => {
    const company = companies.find((c) => c.id === account.companyId);
    return {
      id: account.id,
      name: account.accountName,
      companyName: company?.name || 'Unknown',
      currency: account.currency,
    };
  });

  // Filter bank lines by scope FIRST
  const bankLinesInScope = filterBankLinesByScope(
    mockBankFeedLines,
    scopeFilter,
    showUnassignedLines
  );

  // Then apply additional filters (bank accounts, currency, status)
  const filteredBankLines = bankLinesInScope.filter((line) => {
    // Bank account filter (subset of scope)
    if (selectedBankAccountIds.length > 0 && !selectedBankAccountIds.includes(line.bankAccountId)) {
      return false;
    }

    // Currency filter (display only)
    if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(line.currency)) {
      return false;
    }

    // Status filter (display only)
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(line.status)) {
      return false;
    }

    return true;
  });

  // Filter coverage by scope and additional filters
  const filteredCoverage = mockBankAccountCoverage.filter((account) => {
    // Scope filter: only show accounts in scope
    if (!bankAccountsInScope.find(acc => acc.id === account.bankAccountId)) {
      return false;
    }

    // Bank account filter
    if (selectedBankAccountIds.length > 0 && !selectedBankAccountIds.includes(account.bankAccountId)) {
      return false;
    }

    // Currency filter
    if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(account.currency)) {
      return false;
    }

    return true;
  });

  const stats = getReconciliationStats(filteredBankLines);

  const selectedLine = filteredBankLines.find((line) => line.id === selectedLineId);

  // Get system records for matching (receipts for now)
  const receipts = getAllReceipts();
  const systemRecords: SystemRecord[] = getUnreconciledReceiptsAsSystemRecords(
    receipts,
    scopeFilter.type === 'company' ? scopeFilter.id : undefined,
    scopeFilter.type === 'project' ? scopeFilter.id : undefined
  );

  // Get matching rules
  const matchingRules = getActiveMatchingRules();

  // Get suggested matches - use dynamic if available, generate if not
  const suggestedMatches = selectedLineId
    ? (() => {
        const dynamic = getDynamicSuggestedMatches(selectedLineId);
        if (dynamic.length > 0) return dynamic;
        // Generate suggestions on-the-fly if none cached
        if (selectedLine) {
          return generateSuggestedMatches(selectedLine, systemRecords, matchingRules);
        }
        return [];
      })()
    : [];

  // Handlers
  const handleFilterByStatus = (status: string) => {
    switch (status) {
      case 'all':
        // Clear all filters - show all imported bank lines
        setSelectedStatuses([]);
        setSelectedBankAccountIds([]);
        setSelectedCurrencies([]);
        break;

      case 'matched':
        setSelectedStatuses(['matched']);
        break;

      case 'unmatched':
        setSelectedStatuses(['unmatched']);
        break;

      case 'missing_record':
        setSelectedStatuses(['missing_record']);
        break;

      case 'system-not-in-bank':
        // Open expected bank movement modal
        setShowExpectedBankMovementModal(true);
        break;

      case 'discrepancy':
        // Open discrepancy drilldown modal
        setShowDiscrepancyModal(true);
        break;

      default:
        // Fallback for any other status
        setSelectedStatuses([status as BankFeedStatus]);
    }
  };

  const handleAccountClick = (accountId: string) => {
    setSelectedBankAccountIds([accountId]);
  };

  const handleDownloadStatement = (accountId: string) => {
    console.log("Download statement for account:", accountId);
    // TODO: Implement download statement (CSV or PDF export of transactions for this account)
  };

  const handleOpenAccountDetails = (accountId: string) => {
    console.log("Open account details for account:", accountId);
    // TODO: Implement navigation to bank account details page
    // Could open in new tab or navigate to /accounting/settings/bank-accounts/{accountId}
  };

  const handleSelectLine = (lineId: string) => {
    setSelectedLineId(lineId);
  };

  const handleQuickMatch = (lineId: string) => {
    const line = filteredBankLines.find(l => l.id === lineId);
    if (!line) return;

    // Get suggestions for this line
    const suggestions = getDynamicSuggestedMatches(lineId);
    const onTheFly = suggestions.length > 0 ? suggestions : generateSuggestedMatches(line, systemRecords, matchingRules);

    if (onTheFly.length > 0) {
      const topSuggestion = onTheFly[0];
      // Create match from top suggestion
      const match = createMatchFromSuggestion(line, topSuggestion, 'current-user');
      createBankMatch(lineId, {
        systemRecordType: match.systemRecordType,
        systemRecordId: match.systemRecordId,
        projectId: match.projectId,
        matchedAmount: match.matchedAmount,
        amountDifference: match.amountDifference,
        matchedBy: match.matchedBy,
        matchedAt: match.matchedAt,
        matchScore: match.matchScore,
        matchMethod: 'suggested',
        adjustmentRequired: match.adjustmentRequired,
        adjustmentReason: match.adjustmentReason,
      });
      triggerRefresh();
    }
  };

  const handleIgnore = (lineId: string) => {
    ignoreBankFeedLine(lineId, 'current-user', 'Marked as non-business transaction');
    triggerRefresh();
  };

  const handleCreateMatch = (match: Partial<BankMatch>) => {
    if (!match.bankFeedLineId) return;

    createBankMatch(match.bankFeedLineId, {
      systemRecordType: match.systemRecordType || 'receipt',
      systemRecordId: match.systemRecordId || '',
      projectId: match.projectId,
      matchedAmount: match.matchedAmount || 0,
      amountDifference: match.amountDifference || 0,
      matchedBy: 'current-user',
      matchedAt: new Date().toISOString(),
      matchScore: match.matchScore || 100,
      matchMethod: 'manual',
      adjustmentRequired: match.adjustmentRequired || false,
      adjustmentReason: match.adjustmentReason,
    });
    triggerRefresh();
  };

  const handleRemoveMatch = (matchId: string) => {
    if (!selectedLineId) return;
    removeBankMatch(selectedLineId, matchId);
    triggerRefresh();
  };

  const handleAcceptSuggestion = (suggestion: SuggestedMatch) => {
    if (!selectedLine) return;

    const match = createMatchFromSuggestion(selectedLine, suggestion, 'current-user');
    createBankMatch(selectedLine.id, {
      systemRecordType: match.systemRecordType,
      systemRecordId: match.systemRecordId,
      projectId: match.projectId,
      matchedAmount: match.matchedAmount,
      amountDifference: match.amountDifference,
      matchedBy: match.matchedBy,
      matchedAt: match.matchedAt,
      matchScore: match.matchScore,
      matchMethod: 'suggested',
      adjustmentRequired: match.adjustmentRequired,
      adjustmentReason: match.adjustmentReason,
    });
    triggerRefresh();
  };

  // Handle manual match from search results
  const handleManualMatch = (systemRecord: SystemRecord) => {
    if (!selectedLine) return;

    const matchedAmount = Math.abs(systemRecord.amount);
    const amountDiff = Math.abs(selectedLine.amount) - matchedAmount;

    createBankMatch(selectedLine.id, {
      systemRecordType: systemRecord.type,
      systemRecordId: systemRecord.id,
      projectId: systemRecord.projectId,
      matchedAmount: matchedAmount,
      amountDifference: amountDiff,
      matchedBy: 'current-user',
      matchedAt: new Date().toISOString(),
      matchScore: 100, // Manual match = full confidence
      matchMethod: 'manual',
      adjustmentRequired: Math.abs(amountDiff) > 0.01,
      adjustmentReason: Math.abs(amountDiff) > 0.01 ? 'Amount difference detected' : undefined,
    });
    triggerRefresh();
  };

  // Run auto-matching on all unmatched lines
  const handleRunAutoMatch = useCallback(() => {
    const unmatchedLines = filteredBankLines.filter(
      l => l.status === 'unmatched' || l.status === 'missing_record'
    );

    if (unmatchedLines.length === 0) {
      alert('No unmatched transactions to process.');
      return;
    }

    const result = autoMatchBankLines(unmatchedLines, systemRecords, matchingRules);

    // Apply auto-matches
    if (result.matches.length > 0) {
      applyAutoMatches(result.matches);
    }

    // Update suggestions
    if (result.suggestions.size > 0) {
      updateSuggestionsFromMatchingEngine(result.suggestions);
    }

    triggerRefresh();

    alert(`Auto-matching complete!\n\nMatched: ${result.matches.length} transactions\nSuggestions generated: ${result.suggestions.size} transactions`);
  }, [filteredBankLines, systemRecords, matchingRules, triggerRefresh]);

  const handleCreateNew = (transactionType: TransactionType) => {
    setCreateTransactionModal({ isOpen: true, type: transactionType });
  };

  const handleScopeImport = () => {
    setShowImportSyncModal(true);
  };

  const handleScopeExport = () => {
    setShowExportModal(true);
  };

  const handleImportComplete = () => {
    // Refresh data after import
    // In a real app, this would refetch from the API/database
    console.log('Import complete - data would be refreshed here');
    setShowImportSyncModal(false);
  };

  const handleClearBankAccountFilter = () => {
    setSelectedBankAccountIds([]);
  };

  return (
    <AppShell currentRole="accountant">
      <div className="space-y-6">
        {/* Sticky Header: Reconciliation Scope Bar */}
        <div className="sticky top-0 z-10 bg-white pb-4">
          <ReconciliationScopeBar
            dataScope={dataScope}
            onDataScopeChange={setDataScope}
            companies={companies}
            projects={projects}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            selectedBankAccountIds={selectedBankAccountIds}
            onBankAccountIdsChange={setSelectedBankAccountIds}
            bankAccounts={bankAccounts}
            selectedCurrencies={selectedCurrencies}
            onCurrenciesChange={setSelectedCurrencies}
            selectedStatuses={selectedStatuses}
            onStatusesChange={setSelectedStatuses}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showUnassignedLines={showUnassignedLines}
            onShowUnassignedLinesChange={setShowUnassignedLines}
            onImport={handleScopeImport}
            onExport={handleScopeExport}
          />
        </div>

        {/* KPI Summary Row */}
        <CoverageCards stats={stats} onFilterByStatus={handleFilterByStatus} />

        {/* Bank Accounts Coverage Table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Account Coverage</h2>

          {/* Filter Info Banner */}
          <FilterInfoBanner
            selectedBankAccountIds={selectedBankAccountIds}
            bankAccounts={bankAccounts}
            onClearFilter={handleClearBankAccountFilter}
          />

          <BankAccountCoverageTable
            accounts={filteredCoverage}
            onAccountClick={handleAccountClick}
            onDownloadStatement={handleDownloadStatement}
            onOpenAccountDetails={handleOpenAccountDetails}
          />
        </div>

        {/* Main Matching Workspace */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Bank Reconciliation Workspace</h2>
            <div className="flex items-center gap-2">
              {/* Help tooltip */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {/* Tooltip content */}
                <div className="absolute right-0 top-8 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <h4 className="font-semibold text-gray-900 mb-2">Matching Rules</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Auto-match uses these criteria to find matches. Score must be ≥85 for auto-matching.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exact amount match</span>
                      <span className="font-medium text-gray-900">+40 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference number match</span>
                      <span className="font-medium text-gray-900">+30 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Same date</span>
                      <span className="font-medium text-gray-900">+20 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Close amount (±1%)</span>
                      <span className="font-medium text-gray-900">+20 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Counterparty match</span>
                      <span className="font-medium text-gray-900">+15 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Description keywords</span>
                      <span className="font-medium text-gray-900">+15 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Close date (±3 days)</span>
                      <span className="font-medium text-gray-900">+10 pts</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleRunAutoMatch}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Auto-Match
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: "600px" }}>
            {/* Left: Bank Feed List */}
            <div className="lg:col-span-1">
              <BankFeedList
                bankLines={filteredBankLines}
                selectedLineId={selectedLineId}
                onSelectLine={handleSelectLine}
                onQuickMatch={handleQuickMatch}
                onIgnore={handleIgnore}
              />
            </div>

            {/* Middle + Right: Match Workbench */}
            <div className="lg:col-span-2">
              <MatchWorkbench
                selectedLine={selectedLine}
                suggestedMatches={suggestedMatches}
                systemRecords={systemRecords}
                onCreateMatch={handleCreateMatch}
                onRemoveMatch={handleRemoveMatch}
                onAcceptSuggestion={handleAcceptSuggestion}
                onCreateNew={handleCreateNew}
                onManualMatch={handleManualMatch}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpectedBankMovementModal
        isOpen={showExpectedBankMovementModal}
        onClose={() => setShowExpectedBankMovementModal(false)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        companyId={scopeFilter.type === 'company' ? scopeFilter.id : undefined}
        projectId={scopeFilter.type === 'project' ? scopeFilter.id : undefined}
      />

      <DiscrepancyDrilldownModal
        isOpen={showDiscrepancyModal}
        onClose={() => setShowDiscrepancyModal(false)}
        bankLines={filteredBankLines.filter(line => {
          const hasDiscrepancy = line.matchedAmount !== Math.abs(line.amount);
          const needsReview = line.status === 'needs_review';
          return hasDiscrepancy || needsReview;
        })}
      />

      <ImportSyncModal
        isOpen={showImportSyncModal}
        onClose={() => setShowImportSyncModal(false)}
        bankAccountsInScope={bankAccountsInScope}
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
        onImportComplete={handleImportComplete}
      />

      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        bankLines={filteredBankLines}
        stats={stats}
        dateFrom={dateFrom}
        dateTo={dateTo}
        dataScope={dataScope}
      />

      <CreateTransactionModal
        isOpen={createTransactionModal.isOpen}
        onClose={() => setCreateTransactionModal({ isOpen: false, type: null })}
        transactionType={createTransactionModal.type}
        selectedLine={selectedLine}
        onCreateMatch={(match) => {
          handleCreateMatch(match);
          setCreateTransactionModal({ isOpen: false, type: null });
        }}
        allBankAccounts={allBankAccounts}
        allProjects={allProjects.map(p => ({
          id: p.id,
          name: p.name,
          companyId: p.companyId,
          status: p.status,
        }))}
      />
    </AppShell>
  );
}
