"use client";

import { useState, useCallback, useEffect } from "react";
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
import dynamic from "next/dynamic";

const CreateTransactionModal = dynamic(() =>
  import("@/components/banking/CreateTransactionModal").then(mod => ({ default: mod.CreateTransactionModal }))
);
const BeamTransactionsPanel = dynamic(() =>
  import("@/components/banking/BeamTransactionsPanel")
);
import {
  mockBankAccountCoverage,
  getReconciliationStats,
  parseDataScope,
  filterBankAccountsByScope,
  filterBankLinesByScope,
  getActiveMatchingRules,
  getDynamicSuggestedMatches,
  updateSuggestionsFromMatchingEngine,
} from "@/data/banking/bankReconciliationData";
import { companiesApi, projectsApi, bankAccountsApi, expensesApi } from "@/lib/supabase/api";
import { bankFeedLinesApi, type BankFeedLineWithMatches } from "@/lib/supabase/api/bankFeedLines";
import type { ExpenseWithDetails } from "@/lib/supabase/api/expenses";
import { getAllReceipts } from "@/data/income/receipts";
import { BankAccount } from "@/data/banking/types";
import { Currency } from "@/data/company/types";
import {
  ViewMode,
  BankFeedStatus,
  TransactionType,
  BankMatch,
  SuggestedMatch,
  BankFeedLine,
} from "@/data/banking/bankReconciliationTypes";
import {
  autoMatchBankLines,
  generateSuggestedMatches,
  createMatchFromSuggestion,
  getUnreconciledReceiptsAsSystemRecords,
  getUnreconciledExpensesAsSystemRecords,
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
  const [activeTab, setActiveTab] = useState<'bank-feed' | 'beam' | 'deleted'>('bank-feed');
  const [deletedLines, setDeletedLines] = useState<BankFeedLine[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

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

  // Data from Supabase
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string; companyId: string; status: 'active' | 'completed' | 'archived' }[]>([]);
  const [allBankFeedLines, setAllBankFeedLines] = useState<BankFeedLine[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [companiesData, bankAccountsData, projectsData, bankFeedLinesData, expensesData] = await Promise.all([
          companiesApi.getAll(),
          bankAccountsApi.getAll(),
          projectsApi.getAll(),
          bankFeedLinesApi.getByDateRange(dateFrom, dateTo),
          expensesApi.getWithLineItemsByDateRange(dateFrom, dateTo),
        ]);

        setCompanies(companiesData.map(c => ({ id: c.id, name: c.name })));

        // Map Supabase bank accounts to match BankAccount type
        setAllBankAccounts(bankAccountsData.map(ba => ({
          id: ba.id,
          bankInformation: ba.bank_information as unknown as BankAccount['bankInformation'],
          accountName: ba.account_name,
          accountNumber: ba.account_number,
          currency: ba.currency as Currency,
          companyId: ba.company_id,
          glAccountCode: ba.gl_account_code,
          openingBalance: ba.opening_balance ?? 0,
          openingBalanceDate: ba.opening_balance_date ?? '',
          isActive: ba.is_active,
          createdAt: ba.created_at,
          updatedAt: ba.updated_at,
        })));

        setAllProjects(projectsData.map(p => ({
          id: p.id,
          name: p.name,
          companyId: p.company_id,
          // Map database status: 'inactive' -> 'archived' for component, otherwise keep as-is
          status: p.status === 'inactive' ? 'archived' : (p.status as 'active' | 'completed') ?? 'active',
        })));

        // Map Supabase bank feed lines to match BankFeedLine type
        setAllBankFeedLines(bankFeedLinesData.map((line: BankFeedLineWithMatches): BankFeedLine => ({
          id: line.id,
          bankAccountId: line.bank_account_id,
          companyId: line.company_id,
          projectId: line.project_id || undefined,
          currency: line.currency as Currency,
          transactionDate: line.transaction_date,
          valueDate: line.value_date,
          description: line.description,
          reference: line.reference || undefined,
          amount: line.amount,
          runningBalance: line.running_balance ?? undefined,
          status: line.status as BankFeedStatus,
          matchedAmount: line.matched_amount,
          confidenceScore: line.confidence_score ?? undefined,
          matches: (line.matches || []).map(m => ({
            id: m.id,
            bankFeedLineId: m.bank_feed_line_id,
            systemRecordType: m.system_record_type as TransactionType,
            systemRecordId: m.system_record_id,
            projectId: m.project_id || undefined,
            matchedAmount: m.matched_amount,
            amountDifference: m.amount_difference,
            matchedBy: m.matched_by,
            matchedAt: m.matched_at,
            matchScore: m.match_score,
            matchMethod: m.match_method as 'manual' | 'rule' | 'suggested',
            ruleId: m.rule_id || undefined,
            adjustmentRequired: m.adjustment_required,
            adjustmentReason: m.adjustment_reason || undefined,
            adjustmentJournalId: m.adjustment_journal_id || undefined,
          })),
          importedAt: line.imported_at,
          importedBy: line.imported_by || 'system',
          importSource: line.import_source,
          notes: line.notes || undefined,
          attachments: line.attachments || undefined,
          matchedBy: line.matched_by || undefined,
          matchedAt: line.matched_at || undefined,
          ignoredBy: line.ignored_by || undefined,
          ignoredAt: line.ignored_at || undefined,
          ignoredReason: line.ignored_reason || undefined,
        })));

        // Set expenses
        setAllExpenses(expensesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [refreshKey, dateFrom, dateTo]);

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
    allBankFeedLines,
    scopeFilter,
    showUnassignedLines
  );

  // Then apply additional filters (bank accounts, currency, status)
  const filteredBankLines = bankLinesInScope.filter((line) => {
    // Safety: exclude deleted lines from normal view
    if (line.status === 'deleted') return false;

    // Bank account filter (subset of scope)
    if (selectedBankAccountIds.length > 0 && !selectedBankAccountIds.includes(line.bankAccountId)) {
      return false;
    }

    // Currency filter (display only)
    if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(line.currency)) {
      return false;
    }

    // Status filter (display only)
    // Derive actual status from matches - if matches exist, it's matched
    // This handles cases where database status is out of sync with actual matches
    if (selectedStatuses.length > 0) {
      const hasMatches = line.matches && line.matches.length > 0;
      const actualStatus: BankFeedStatus = hasMatches ? 'matched' : line.status;
      if (!selectedStatuses.includes(actualStatus)) {
        return false;
      }
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

  // Collect all system record IDs that are already matched to bank feed lines
  // This prevents already-matched records from appearing as suggestions
  const matchedRecordIds = new Set<string>();
  for (const line of allBankFeedLines) {
    for (const match of line.matches) {
      matchedRecordIds.add(match.systemRecordId);
    }
  }

  // Get system records for matching (receipts + expenses)
  // Pass matchedRecordIds to exclude already-matched records from suggestions
  const receipts = getAllReceipts();
  const receiptRecords = getUnreconciledReceiptsAsSystemRecords(
    receipts,
    scopeFilter.type === 'company' ? scopeFilter.id : undefined,
    scopeFilter.type === 'project' ? scopeFilter.id : undefined,
    matchedRecordIds
  );
  const expenseRecords = getUnreconciledExpensesAsSystemRecords(
    allExpenses,
    scopeFilter.type === 'company' ? scopeFilter.id : undefined,
    scopeFilter.type === 'project' ? scopeFilter.id : undefined,
    matchedRecordIds
  );
  const systemRecords: SystemRecord[] = [...receiptRecords, ...expenseRecords];

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

  const handleQuickMatch = async (lineId: string) => {
    const line = filteredBankLines.find(l => l.id === lineId);
    if (!line) return;

    // Check if the bank feed line already has a match
    if (line.matches.length > 0) {
      alert('This bank transaction already has a match. Please remove the existing match first.');
      return;
    }

    // Get suggestions for this line
    const suggestions = getDynamicSuggestedMatches(lineId);
    const onTheFly = suggestions.length > 0 ? suggestions : generateSuggestedMatches(line, systemRecords, matchingRules);

    if (onTheFly.length > 0) {
      const topSuggestion = onTheFly[0];
      // Create match from top suggestion
      const match = createMatchFromSuggestion(line, topSuggestion, 'current-user');
      try {
        await bankFeedLinesApi.createMatch({
          bank_feed_line_id: lineId,
          system_record_type: match.systemRecordType,
          system_record_id: match.systemRecordId,
          project_id: match.projectId,
          matched_amount: match.matchedAmount,
          amount_difference: match.amountDifference,
          matched_by: match.matchedBy,
          match_score: match.matchScore,
          match_method: 'suggested',
          adjustment_required: match.adjustmentRequired,
          adjustment_reason: match.adjustmentReason,
        });
        // Update bank feed line status
        await bankFeedLinesApi.updateStatus(lineId, 'matched', match.matchedAmount);
        triggerRefresh();
      } catch (error) {
        console.error('Failed to create match:', error);
      }
    }
  };

  const handleIgnore = async (lineId: string) => {
    try {
      await bankFeedLinesApi.markAsIgnored(lineId, 'current-user', 'Marked as non-business transaction');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to ignore line:', error);
    }
  };

  const handleCreateMatch = async (match: Partial<BankMatch>) => {
    if (!match.bankFeedLineId) return;

    // Check if the bank feed line already has a match
    const line = filteredBankLines.find(l => l.id === match.bankFeedLineId);
    if (line && line.matches.length > 0) {
      alert('This bank transaction already has a match. Please remove the existing match first.');
      return;
    }

    try {
      await bankFeedLinesApi.createMatch({
        bank_feed_line_id: match.bankFeedLineId,
        system_record_type: match.systemRecordType || 'receipt',
        system_record_id: match.systemRecordId || '',
        project_id: match.projectId,
        matched_amount: match.matchedAmount || 0,
        amount_difference: match.amountDifference || 0,
        matched_by: 'current-user',
        match_score: match.matchScore || 100,
        match_method: 'manual',
        adjustment_required: match.adjustmentRequired || false,
        adjustment_reason: match.adjustmentReason,
      });
      // Update bank feed line status
      await bankFeedLinesApi.updateStatus(match.bankFeedLineId, 'matched', match.matchedAmount);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  };

  const handleRemoveMatch = async (matchId: string) => {
    if (!selectedLineId) return;
    try {
      await bankFeedLinesApi.deleteMatch(matchId);
      await bankFeedLinesApi.updateStatus(selectedLineId, 'unmatched', 0);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to remove match:', error);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      await bankFeedLinesApi.delete(lineId);
      if (selectedLineId === lineId) setSelectedLineId(undefined);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  // Load deleted lines when Deleted tab is active
  useEffect(() => {
    if (activeTab !== 'deleted') return;
    const loadDeleted = async () => {
      setLoadingDeleted(true);
      try {
        const companyIds = companies.map(c => c.id);
        if (companyIds.length === 0) return;
        const data = await bankFeedLinesApi.getDeleted(companyIds);
        setDeletedLines(data.map((line: BankFeedLineWithMatches): BankFeedLine => ({
          id: line.id,
          bankAccountId: line.bank_account_id,
          companyId: line.company_id,
          projectId: line.project_id || undefined,
          currency: line.currency as Currency,
          transactionDate: line.transaction_date,
          valueDate: line.value_date,
          description: line.description,
          reference: line.reference || undefined,
          amount: line.amount,
          runningBalance: line.running_balance ?? undefined,
          status: line.status as BankFeedStatus,
          matchedAmount: line.matched_amount,
          confidenceScore: line.confidence_score ?? undefined,
          matches: (line.matches || []).map(m => ({
            id: m.id,
            bankFeedLineId: m.bank_feed_line_id,
            systemRecordType: m.system_record_type as TransactionType,
            systemRecordId: m.system_record_id,
            projectId: m.project_id || undefined,
            matchedAmount: m.matched_amount,
            amountDifference: m.amount_difference,
            matchedBy: m.matched_by,
            matchedAt: m.matched_at,
            matchScore: m.match_score,
            matchMethod: m.match_method as 'manual' | 'rule' | 'suggested',
            ruleId: m.rule_id || undefined,
            adjustmentRequired: m.adjustment_required,
            adjustmentReason: m.adjustment_reason || undefined,
            adjustmentJournalId: m.adjustment_journal_id || undefined,
          })),
          importedAt: line.imported_at,
          importedBy: line.imported_by || 'system',
          importSource: line.import_source,
          notes: line.notes || undefined,
          attachments: line.attachments || undefined,
          matchedBy: line.matched_by || undefined,
          matchedAt: line.matched_at || undefined,
          ignoredBy: line.ignored_by || undefined,
          ignoredAt: line.ignored_at || undefined,
          ignoredReason: line.ignored_reason || undefined,
        })));
      } catch (error) {
        console.error('Failed to load deleted lines:', error);
      } finally {
        setLoadingDeleted(false);
      }
    };
    loadDeleted();
  }, [activeTab, companies, refreshKey]);

  const handleRestoreLine = async (lineId: string) => {
    try {
      await bankFeedLinesApi.restore(lineId);
      setDeletedLines(prev => prev.filter(l => l.id !== lineId));
      triggerRefresh();
    } catch (error) {
      console.error('Failed to restore transaction:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestion: SuggestedMatch) => {
    if (!selectedLine) return;

    // Check if the bank feed line already has a match
    if (selectedLine.matches.length > 0) {
      alert('This bank transaction already has a match. Please remove the existing match first.');
      return;
    }

    const match = createMatchFromSuggestion(selectedLine, suggestion, 'current-user');
    try {
      await bankFeedLinesApi.createMatch({
        bank_feed_line_id: selectedLine.id,
        system_record_type: match.systemRecordType,
        system_record_id: match.systemRecordId,
        project_id: match.projectId,
        matched_amount: match.matchedAmount,
        amount_difference: match.amountDifference,
        matched_by: match.matchedBy,
        match_score: match.matchScore,
        match_method: 'suggested',
        adjustment_required: match.adjustmentRequired,
        adjustment_reason: match.adjustmentReason,
      });
      await bankFeedLinesApi.updateStatus(selectedLine.id, 'matched', match.matchedAmount);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  // Handle manual match from search results
  const handleManualMatch = async (systemRecord: SystemRecord) => {
    if (!selectedLine) return;

    // Check if the bank feed line already has a match
    if (selectedLine.matches.length > 0) {
      alert('This bank transaction already has a match. Please remove the existing match first.');
      return;
    }

    const matchedAmount = Math.abs(systemRecord.amount);
    const amountDiff = Math.abs(selectedLine.amount) - matchedAmount;

    try {
      await bankFeedLinesApi.createMatch({
        bank_feed_line_id: selectedLine.id,
        system_record_type: systemRecord.type,
        system_record_id: systemRecord.id,
        project_id: systemRecord.projectId,
        matched_amount: matchedAmount,
        amount_difference: amountDiff,
        matched_by: 'current-user',
        match_score: 100, // Manual match = full confidence
        match_method: 'manual',
        adjustment_required: Math.abs(amountDiff) > 0.01,
        adjustment_reason: Math.abs(amountDiff) > 0.01 ? 'Amount difference detected' : undefined,
      });
      await bankFeedLinesApi.updateStatus(selectedLine.id, 'matched', matchedAmount);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to create manual match:', error);
    }
  };

  // Run auto-matching on all unmatched lines
  const handleRunAutoMatch = useCallback(async () => {
    // Only include lines without existing matches
    const unmatchedLines = filteredBankLines.filter(
      l => (l.status === 'unmatched' || l.status === 'missing_record') && l.matches.length === 0
    );

    if (unmatchedLines.length === 0) {
      alert('No unmatched transactions to process.');
      return;
    }

    const result = autoMatchBankLines(unmatchedLines, systemRecords, matchingRules);

    // Apply auto-matches to Supabase
    let matchedCount = 0;
    for (const match of result.matches) {
      try {
        await bankFeedLinesApi.createMatch({
          bank_feed_line_id: match.bankFeedLineId,
          system_record_type: match.systemRecordType,
          system_record_id: match.systemRecordId,
          project_id: match.projectId,
          matched_amount: match.matchedAmount,
          amount_difference: match.amountDifference,
          matched_by: match.matchedBy,
          match_score: match.matchScore,
          match_method: match.matchMethod,
          rule_id: match.ruleId,
          adjustment_required: match.adjustmentRequired,
          adjustment_reason: match.adjustmentReason,
        });
        await bankFeedLinesApi.updateStatus(match.bankFeedLineId, 'matched', match.matchedAmount);
        matchedCount++;
      } catch (error) {
        console.error('Failed to apply auto-match:', error);
      }
    }

    // Update suggestions in local state
    if (result.suggestions.size > 0) {
      updateSuggestionsFromMatchingEngine(result.suggestions);
    }

    triggerRefresh();

    alert(`Auto-matching complete!\n\nMatched: ${matchedCount} transactions\nSuggestions generated: ${result.suggestions.size} transactions`);
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
    triggerRefresh();
    setShowImportSyncModal(false);
  };

  const handleClearBankAccountFilter = () => {
    setSelectedBankAccountIds([]);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F]"></div>
            <p className="text-sm text-gray-500">Loading bank reconciliation data...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
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

          {/* Tab bar */}
          <div className="flex gap-1 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('bank-feed')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bank-feed'
                  ? 'border-[#5A7A8F] text-[#5A7A8F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Bank Feed
            </button>
            <button
              onClick={() => setActiveTab('beam')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'beam'
                  ? 'border-[#5A7A8F] text-[#5A7A8F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Beam Transactions
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'deleted'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Deleted
              {deletedLines.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  {deletedLines.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'deleted' ? (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Deleted Transactions</h3>
              <p className="text-xs text-gray-500 mt-0.5">Transactions removed from the bank feed. You can restore them if needed.</p>
            </div>
            {loadingDeleted ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5A7A8F]"></div>
                  <span>Loading deleted transactions...</span>
                </div>
              </div>
            ) : deletedLines.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No deleted transactions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deleted At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deletedLines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(line.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                          {line.description}
                          {line.reference && <span className="text-xs text-gray-500 ml-2">Ref: {line.reference}</span>}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium text-right whitespace-nowrap ${line.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: line.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(line.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {line.ignoredAt ? new Date(line.ignoredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRestoreLine(line.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 hover:bg-[#5A7A8F]/20 rounded transition-colors"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'beam' ? (
          <BeamTransactionsPanel dateFrom={dateFrom} dateTo={dateTo} />
        ) : (
        <>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 400px)", minHeight: "500px" }}>
            {/* Left: Bank Feed List */}
            <div className="lg:col-span-1 h-full overflow-hidden">
              <BankFeedList
                bankLines={filteredBankLines}
                selectedLineId={selectedLineId}
                onSelectLine={handleSelectLine}
                onQuickMatch={handleQuickMatch}
                onIgnore={handleIgnore}
                onDelete={handleDeleteLine}
              />
            </div>

            {/* Middle + Right: Match Workbench */}
            <div className="lg:col-span-2 h-full overflow-hidden">
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
        </>
        )}
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
        companies={companies}
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
        allProjects={allProjects}
      />
    </AppShell>
  );
}
