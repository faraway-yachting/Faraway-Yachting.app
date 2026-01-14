'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Info, Plus, AlertCircle } from 'lucide-react';
import {
  BankFeedLine,
  BankMatch,
  TransactionType,
} from '@/data/banking/bankReconciliationTypes';
import { BankAccount } from '@/data/banking/types';
import { expensesApi } from '@/lib/supabase/api/expenses';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { journalEntriesApi, chartOfAccountsApi } from '@/lib/supabase/api/journalEntries';
import ClientSelector from '@/components/income/ClientSelector';
import { VendorSelector } from '@/components/expenses/VendorSelector';
import type { Database } from '@/lib/supabase/database.types';

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: TransactionType | null;
  selectedLine: BankFeedLine | undefined;
  onCreateMatch: (match: Partial<BankMatch>) => void;
  allBankAccounts: BankAccount[];
  allProjects: { id: string; name: string; companyId: string; status: 'active' | 'completed' | 'archived' }[];
}

// Utility function to generate document numbers
function generateDocumentNumber(prefix: string): string {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${yymm}${random}`;
}

// Utility function to get type-specific Tailwind classes
function getTypeClasses(type: TransactionType | null) {
  switch (type) {
    case 'receipt':
      return {
        header: 'border-green-200 bg-green-50',
        headerText: 'text-green-900',
        summary: 'bg-green-50 border-green-100',
        summaryIcon: 'text-green-600',
        summaryText: 'text-green-700',
        button: 'bg-green-600 hover:bg-green-700',
        focus: 'focus:ring-green-500',
      };
    case 'expense':
      return {
        header: 'border-red-200 bg-red-50',
        headerText: 'text-red-900',
        summary: 'bg-red-50 border-red-100',
        summaryIcon: 'text-red-600',
        summaryText: 'text-red-700',
        button: 'bg-red-600 hover:bg-red-700',
        focus: 'focus:ring-red-500',
      };
    case 'transfer':
      return {
        header: 'border-blue-200 bg-blue-50',
        headerText: 'text-blue-900',
        summary: 'bg-blue-50 border-blue-100',
        summaryIcon: 'text-blue-600',
        summaryText: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700',
        focus: 'focus:ring-blue-500',
      };
    case 'owner_contribution':
      return {
        header: 'border-purple-200 bg-purple-50',
        headerText: 'text-purple-900',
        summary: 'bg-purple-50 border-purple-100',
        summaryIcon: 'text-purple-600',
        summaryText: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700',
        focus: 'focus:ring-purple-500',
      };
    default:
      return {
        header: 'border-gray-200 bg-gray-50',
        headerText: 'text-gray-900',
        summary: 'bg-gray-50 border-gray-100',
        summaryIcon: 'text-gray-600',
        summaryText: 'text-gray-700',
        button: 'bg-gray-600 hover:bg-gray-700',
        focus: 'focus:ring-gray-500',
      };
  }
}

// Helper to filter accounts by type
function filterAccountsByType(accounts: ChartOfAccount[], types: string[]): ChartOfAccount[] {
  return accounts.filter(acc => acc.is_active && types.includes(acc.account_type));
}

export function CreateTransactionModal({
  isOpen,
  onClose,
  transactionType,
  selectedLine,
  onCreateMatch,
  allBankAccounts,
  allProjects,
}: CreateTransactionModalProps) {
  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Chart of Accounts state
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Fetch Chart of Accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accounts = await chartOfAccountsApi.getAll();
        setChartOfAccounts(accounts);
      } catch (error) {
        console.error('Failed to fetch chart of accounts:', error);
      } finally {
        setAccountsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Filtered accounts by type (memoized to prevent infinite loops in useEffect)
  const revenueAccounts = useMemo(
    () => filterAccountsByType(chartOfAccounts, ['Revenue']),
    [chartOfAccounts]
  );
  const expenseAccounts = useMemo(
    () => filterAccountsByType(chartOfAccounts, ['Expense']),
    [chartOfAccounts]
  );
  const equityAccounts = useMemo(
    () => filterAccountsByType(chartOfAccounts, ['Equity']),
    [chartOfAccounts]
  );

  // Get the bank account for the selected line
  const sourceBankAccount = selectedLine
    ? allBankAccounts.find((acc) => acc.id === selectedLine.bankAccountId)
    : undefined;

  // Determine the effective company ID (prefer bank account's company, fallback to line's company)
  const effectiveCompanyId = sourceBankAccount?.companyId || selectedLine?.companyId;

  // Show ALL active/completed projects in the system (not filtered by company)
  // Users need to be able to assign any project to bank transactions
  const availableProjects = allProjects.filter((p) => p.status !== 'archived');

  // Filter bank accounts for transfers (exclude current account, but show all companies)
  const availableTransferAccounts = selectedLine
    ? allBankAccounts.filter((acc) => acc.id !== selectedLine.bankAccountId)
    : [];

  // Calculate remaining amount
  const remainingAmount = selectedLine
    ? Math.abs(selectedLine.amount) - selectedLine.matchedAmount
    : 0;

  // Reset form when modal opens or transaction type changes
  useEffect(() => {
    if (isOpen && selectedLine && transactionType) {
      const defaultData: Record<string, any> = {
        amount: remainingAmount,
        date: selectedLine.transactionDate,
        description: selectedLine.description || '',
        bankReference: selectedLine.reference || '',
      };

      // Type-specific defaults
      if (transactionType === 'receipt') {
        // Default to first revenue account if available
        const defaultRevenue = revenueAccounts.find(a => a.code.startsWith('4')) || revenueAccounts[0];
        defaultData.glAccount = defaultRevenue?.code || '';
      } else if (transactionType === 'expense') {
        // Default to first expense account if available
        const defaultExpense = expenseAccounts.find(a => a.code.startsWith('6')) || expenseAccounts[0];
        defaultData.glAccount = defaultExpense?.code || '';
      } else if (transactionType === 'transfer') {
        defaultData.fromAccount = selectedLine.bankAccountId;
        defaultData.transferType = 'internal';
      } else if (transactionType === 'owner_contribution') {
        // Auto-select type based on amount sign
        const isContribution = selectedLine.amount > 0;
        defaultData.ownerType = isContribution ? 'contribution' : 'draw';
        // Find equity accounts by code pattern
        const capitalAccount = equityAccounts.find(a => a.code.startsWith('31'));
        const drawingsAccount = equityAccounts.find(a => a.code.startsWith('32'));
        defaultData.glAccount = isContribution
          ? (capitalAccount?.code || equityAccounts[0]?.code || '')
          : (drawingsAccount?.code || equityAccounts[0]?.code || '');
        defaultData.taxTreatment = 'tbd';
      }

      setFormData(defaultData);
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, selectedLine, transactionType, remainingAmount, revenueAccounts, expenseAccounts, equityAccounts]);

  if (!isOpen || !selectedLine || !transactionType) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Special handling for owner type change - update GL account
    if (field === 'ownerType' && transactionType === 'owner_contribution') {
      const capitalAccount = equityAccounts.find(a => a.code.startsWith('31'));
      const drawingsAccount = equityAccounts.find(a => a.code.startsWith('32'));
      setFormData((prev) => ({
        ...prev,
        glAccount: value === 'contribution'
          ? (capitalAccount?.code || equityAccounts[0]?.code || '')
          : (drawingsAccount?.code || equityAccounts[0]?.code || ''),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (formData.amount > remainingAmount) {
      newErrors.amount = `Amount cannot exceed remaining ${formatAmount(remainingAmount, selectedLine.currency)}`;
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    // Type-specific validations
    if (transactionType === 'receipt') {
      if (!formData.customerId || !formData.counterparty) {
        newErrors.counterparty = 'Please select a customer';
      }
      if (!formData.glAccount) {
        newErrors.glAccount = 'GL Account is required';
      }
      if (!formData.projectId) {
        newErrors.projectId = 'Project is required';
      }
    } else if (transactionType === 'expense') {
      if (!formData.vendorId || !formData.supplier) {
        newErrors.supplier = 'Please select a vendor';
      }
      if (!formData.glAccount) {
        newErrors.glAccount = 'GL Account is required';
      }
      if (!formData.projectId) {
        newErrors.projectId = 'Project is required';
      }
    } else if (transactionType === 'transfer') {
      if (!formData.toAccount) {
        newErrors.toAccount = 'To Account is required';
      }
      if (formData.toAccount === formData.fromAccount) {
        newErrors.toAccount = 'To Account must be different from From Account';
      }
      // Check currency match for internal transfers
      if (formData.transferType === 'internal' && formData.toAccount) {
        const toAcc = allBankAccounts.find((a) => a.id === formData.toAccount);
        if (toAcc && toAcc.currency !== selectedLine.currency) {
          newErrors.toAccount = 'Account currencies must match for internal transfers';
        }
      }
    } else if (transactionType === 'owner_contribution') {
      if (!formData.ownerName || formData.ownerName.trim() === '') {
        newErrors.ownerName = 'Owner name is required';
      }
      if (!formData.ownerType) {
        newErrors.ownerType = 'Type is required';
      }
      if (!formData.glAccount) {
        newErrors.glAccount = 'GL Account is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let createdRecordId: string = '';
      let createdRecordType: string = transactionType;

      if (transactionType === 'expense') {
        // Create real expense record
        const expenseNumber = generateDocumentNumber('EXP');

        const expense = await expensesApi.create(
          {
            company_id: effectiveCompanyId!,
            expense_number: expenseNumber,
            vendor_id: formData.vendorId || null,
            vendor_name: formData.supplier,
            expense_date: formData.date,
            subtotal: formData.amount,
            vat_amount: 0, // Simple expense from bank reconciliation - no VAT
            total_amount: formData.amount,
            wht_amount: 0,
            net_payable: formData.amount,
            payment_status: 'paid', // Already paid since it's from bank
            status: 'approved',
            currency: selectedLine.currency,
            notes: `Bank Reference: ${formData.bankReference || ''}\n${formData.description}`,
          },
          [
            {
              expense_id: '', // Will be set by API
              project_id: formData.projectId,
              description: formData.description,
              quantity: 1,
              unit_price: formData.amount,
              tax_rate: 0,
              wht_rate: '0',
              amount: formData.amount,
              account_code: formData.glAccount,
            },
          ]
        );

        createdRecordId = expense.id;

        // Create payment record for the expense
        await expensesApi.addPayment({
          expense_id: expense.id,
          payment_date: formData.date,
          amount: formData.amount,
          paid_from: selectedLine.bankAccountId,
          reference: formData.bankReference || selectedLine.reference || '',
        });

      } else if (transactionType === 'receipt') {
        // Create real receipt record
        const receiptNumber = generateDocumentNumber('REC');

        const receipt = await receiptsApi.create(
          {
            company_id: effectiveCompanyId!,
            receipt_number: receiptNumber,
            client_id: formData.customerId || null,
            client_name: formData.counterparty,
            receipt_date: formData.date,
            reference: formData.invoiceRef || formData.bankReference || '',
            subtotal: formData.amount,
            tax_amount: 0, // Simple receipt from bank reconciliation - no VAT
            total_amount: formData.amount,
            total_received: formData.amount,
            currency: selectedLine.currency,
            status: 'paid',
            notes: `Bank Reference: ${formData.bankReference || ''}\n${formData.description}`,
          },
          [
            {
              receipt_id: '', // Will be set by API
              project_id: formData.projectId,
              description: formData.description,
              quantity: 1,
              unit_price: formData.amount,
              tax_rate: 0,
              wht_rate: '0',
              amount: formData.amount,
            },
          ]
        );

        createdRecordId = receipt.id;

        // Create payment record for the receipt
        await receiptsApi.addPaymentRecord({
          receipt_id: receipt.id,
          payment_date: formData.date,
          amount: formData.amount,
          received_at: selectedLine.bankAccountId,
          remark: formData.bankReference || selectedLine.reference || '',
        });

      } else if (transactionType === 'transfer') {
        // Create journal entry for bank transfer
        const toAccount = allBankAccounts.find((a) => a.id === formData.toAccount);
        const fromAccount = sourceBankAccount;

        if (!fromAccount || !toAccount) {
          throw new Error('Bank accounts not found');
        }

        const journalEntry = await journalEntriesApi.create({
          company_id: effectiveCompanyId!,
          entry_date: formData.date,
          reference_number: generateDocumentNumber('TRF'),
          description: `Bank Transfer: ${fromAccount.accountName} → ${toAccount.accountName}\n${formData.description}`,
          status: 'draft',
          total_debit: formData.amount,
          total_credit: formData.amount,
          source_document_type: 'bank_transfer',
        }, [
          {
            account_code: toAccount.glAccountCode || '1010',
            description: `Transfer from ${fromAccount.accountName}`,
            entry_type: 'debit',
            amount: formData.amount,
          },
          {
            account_code: fromAccount.glAccountCode || '1010',
            description: `Transfer to ${toAccount.accountName}`,
            entry_type: 'credit',
            amount: formData.amount,
          },
        ]);

        createdRecordId = journalEntry.id;
        createdRecordType = 'transfer';

      } else if (transactionType === 'owner_contribution') {
        // Create journal entry for owner contribution/draw
        const bankGlCode = sourceBankAccount?.glAccountCode || '1010';
        const equityGlCode = formData.glAccount;
        const isContribution = formData.ownerType === 'contribution';

        const journalEntry = await journalEntriesApi.create({
          company_id: effectiveCompanyId!,
          entry_date: formData.date,
          reference_number: generateDocumentNumber(isContribution ? 'OWN' : 'DRW'),
          description: `${isContribution ? 'Owner Capital Contribution' : 'Owner Draw'}: ${formData.ownerName}\n${formData.description}`,
          status: 'draft',
          total_debit: formData.amount,
          total_credit: formData.amount,
          source_document_type: 'owner_transaction',
        }, isContribution
          ? [
              // Capital contribution: Debit Bank, Credit Owner Capital
              {
                account_code: bankGlCode,
                description: `Capital contribution from ${formData.ownerName}`,
                entry_type: 'debit',
                amount: formData.amount,
              },
              {
                account_code: equityGlCode,
                description: `Capital contribution from ${formData.ownerName}`,
                entry_type: 'credit',
                amount: formData.amount,
              },
            ]
          : [
              // Owner draw: Debit Owner Drawings, Credit Bank
              {
                account_code: equityGlCode,
                description: `Owner draw to ${formData.ownerName}`,
                entry_type: 'debit',
                amount: formData.amount,
              },
              {
                account_code: bankGlCode,
                description: `Owner draw to ${formData.ownerName}`,
                entry_type: 'credit',
                amount: formData.amount,
              },
            ]
        );

        createdRecordId = journalEntry.id;
        createdRecordType = 'owner_contribution';
      }

      // Create the match record to link bank line to created record
      const match: Partial<BankMatch> = {
        bankFeedLineId: selectedLine.id,
        systemRecordType: createdRecordType as TransactionType,
        systemRecordId: createdRecordId,
        projectId: formData.projectId,
        matchedAmount: formData.amount,
        amountDifference: 0,
        matchedBy: 'current-user', // TODO: Replace with actual auth
        matchedAt: new Date().toISOString(),
        matchScore: 100,
        matchMethod: 'manual',
        adjustmentRequired: false,
      };

      onCreateMatch(match);
      setIsSubmitting(false);

    } catch (error) {
      console.error('Failed to create transaction:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create transaction. Please try again.');
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getModalTitle = () => {
    switch (transactionType) {
      case 'receipt':
        return 'Create Receipt (Customer Payment)';
      case 'expense':
        return 'Create Expense (Vendor Payment)';
      case 'transfer':
        return 'Create Transfer (Between Accounts)';
      case 'owner_contribution':
        return 'Create Owner Transaction';
      default:
        return 'Create Transaction';
    }
  };

  const typeClasses = getTypeClasses(transactionType);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Fixed Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${typeClasses.header} flex-shrink-0 rounded-t-lg`}>
            <div>
              <h2 className={`text-lg font-semibold ${typeClasses.headerText}`}>{getModalTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create real {transactionType?.replace('_', ' ')} record linked to bank transaction
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Amount Summary */}
          <div className={`px-6 py-3 ${typeClasses.summary} border-b`}>
            <div className="flex items-center gap-2">
              <Info className={`h-4 w-4 ${typeClasses.summaryIcon}`} />
              <p className="text-sm text-gray-700">
                <span className="font-medium">Remaining amount to match:</span>{' '}
                <span className={`font-bold ${typeClasses.summaryText}`}>
                  {formatAmount(remainingAmount, selectedLine.currency)}
                </span>
                {' of '}
                {formatAmount(Math.abs(selectedLine.amount), selectedLine.currency)}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{submitError}</p>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Render form based on transaction type */}
            {transactionType === 'receipt' && (
              <div className="space-y-4">
                {/* Counterparty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <ClientSelector
                    value={formData.customerId || ''}
                    onChange={(clientId, clientName) => {
                      handleChange('customerId', clientId);
                      handleChange('counterparty', clientName);
                    }}
                    required
                  />
                  {errors.counterparty && (
                    <p className="text-sm text-red-600 mt-1">{errors.counterparty}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Amount <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.amount || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <span className="text-sm font-medium text-gray-700">{selectedLine.currency}</span>
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Date <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.date ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600 mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => handleChange('projectId', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.projectId ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    <option value="">Select project...</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {errors.projectId && (
                    <p className="text-sm text-red-600 mt-1">{errors.projectId}</p>
                  )}
                </div>

                {/* GL Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GL Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.glAccount || ''}
                    onChange={(e) => handleChange('glAccount', e.target.value)}
                    disabled={accountsLoading}
                    className={`w-full px-3 py-2 border ${errors.glAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus} disabled:bg-gray-50`}
                  >
                    {accountsLoading ? (
                      <option value="">Loading accounts...</option>
                    ) : revenueAccounts.length === 0 ? (
                      <option value="">No revenue accounts available</option>
                    ) : (
                      <>
                        <option value="">Select account...</option>
                        {revenueAccounts.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.glAccount && (
                    <p className="text-sm text-red-600 mt-1">{errors.glAccount}</p>
                  )}
                </div>

                {/* Invoice Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceRef || ''}
                    onChange={(e) => handleChange('invoiceRef', e.target.value)}
                    placeholder="e.g., INV-2024-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Description <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className={`w-full px-3 py-2 border ${errors.description ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  <div className="flex justify-between mt-1">
                    <div>
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.description?.length || 0} / 500
                    </p>
                  </div>
                </div>

                {/* Bank Reference (readonly) */}
                {formData.bankReference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Reference
                    </label>
                    <input
                      type="text"
                      value={formData.bankReference}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                )}
              </div>
            )}

            {transactionType === 'expense' && (
              <div className="space-y-4">
                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <VendorSelector
                    value={formData.vendorId || ''}
                    onChange={(vendorId, vendorName) => {
                      handleChange('vendorId', vendorId);
                      handleChange('supplier', vendorName);
                    }}
                    required
                  />
                  {errors.supplier && (
                    <p className="text-sm text-red-600 mt-1">{errors.supplier}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Amount <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.amount || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <span className="text-sm font-medium text-gray-700">{selectedLine.currency}</span>
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Date <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.date ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600 mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => handleChange('projectId', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.projectId ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    <option value="">Select project...</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {errors.projectId && (
                    <p className="text-sm text-red-600 mt-1">{errors.projectId}</p>
                  )}
                </div>

                {/* GL Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GL Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.glAccount || ''}
                    onChange={(e) => handleChange('glAccount', e.target.value)}
                    disabled={accountsLoading}
                    className={`w-full px-3 py-2 border ${errors.glAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus} disabled:bg-gray-50`}
                  >
                    {accountsLoading ? (
                      <option value="">Loading accounts...</option>
                    ) : expenseAccounts.length === 0 ? (
                      <option value="">No expense accounts available</option>
                    ) : (
                      <>
                        <option value="">Select account...</option>
                        {expenseAccounts.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.glAccount && (
                    <p className="text-sm text-red-600 mt-1">{errors.glAccount}</p>
                  )}
                </div>

                {/* Expense Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.expenseRef || ''}
                    onChange={(e) => handleChange('expenseRef', e.target.value)}
                    placeholder="e.g., EXP-2024-001, Invoice #12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Description <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className={`w-full px-3 py-2 border ${errors.description ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  <div className="flex justify-between mt-1">
                    <div>
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.description?.length || 0} / 500
                    </p>
                  </div>
                </div>

                {/* Bank Reference (readonly) */}
                {formData.bankReference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Reference
                    </label>
                    <input
                      type="text"
                      value={formData.bankReference}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                )}
              </div>
            )}

            {transactionType === 'transfer' && (
              <div className="space-y-4">
                {/* From Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    From Account <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <input
                    type="text"
                    value={sourceBankAccount?.accountName || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                {/* To Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.toAccount || ''}
                    onChange={(e) => handleChange('toAccount', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.toAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    <option value="">Select account...</option>
                    {availableTransferAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.currency})
                      </option>
                    ))}
                  </select>
                  {errors.toAccount && (
                    <p className="text-sm text-red-600 mt-1">{errors.toAccount}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Amount <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.amount || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <span className="text-sm font-medium text-gray-700">{selectedLine.currency}</span>
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Date <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.date ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600 mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Transfer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="internal"
                        checked={formData.transferType === 'internal'}
                        onChange={(e) => handleChange('transferType', e.target.value)}
                        className={`text-blue-600 ${typeClasses.focus}`}
                      />
                      <span className="text-sm text-gray-700">Internal Transfer</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="exchange"
                        checked={formData.transferType === 'exchange'}
                        onChange={(e) => handleChange('transferType', e.target.value)}
                        className={`text-blue-600 ${typeClasses.focus}`}
                      />
                      <span className="text-sm text-gray-700">Currency Exchange</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Description <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className={`w-full px-3 py-2 border ${errors.description ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  <div className="flex justify-between mt-1">
                    <div>
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.description?.length || 0} / 500
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2}
                    placeholder="For exchange rate or additional context..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>

                {/* Bank Reference (readonly) */}
                {formData.bankReference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Reference
                    </label>
                    <input
                      type="text"
                      value={formData.bankReference}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                )}
              </div>
            )}

            {transactionType === 'owner_contribution' && (
              <div className="space-y-4">
                {/* Owner Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName || ''}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    placeholder="e.g., John Smith"
                    className={`w-full px-3 py-2 border ${errors.ownerName ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  {errors.ownerName && (
                    <p className="text-sm text-red-600 mt-1">{errors.ownerName}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Amount <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.amount || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                    <span className="text-sm font-medium text-gray-700">{selectedLine.currency}</span>
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Date <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.date ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600 mt-1">{errors.date}</p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Type <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-selected based on amount
                    </span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="contribution"
                        checked={formData.ownerType === 'contribution'}
                        onChange={(e) => handleChange('ownerType', e.target.value)}
                        className={`text-purple-600 ${typeClasses.focus}`}
                      />
                      <span className="text-sm text-gray-700">Capital Contribution</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="draw"
                        checked={formData.ownerType === 'draw'}
                        onChange={(e) => handleChange('ownerType', e.target.value)}
                        className={`text-purple-600 ${typeClasses.focus}`}
                      />
                      <span className="text-sm text-gray-700">Owner Draw</span>
                    </label>
                  </div>
                  {errors.ownerType && (
                    <p className="text-sm text-red-600 mt-1">{errors.ownerType}</p>
                  )}
                </div>

                {/* GL Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    GL Account <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-selected based on type
                    </span>
                  </label>
                  <select
                    value={formData.glAccount || ''}
                    onChange={(e) => handleChange('glAccount', e.target.value)}
                    disabled={accountsLoading}
                    className={`w-full px-3 py-2 border ${errors.glAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus} disabled:bg-gray-50`}
                  >
                    {accountsLoading ? (
                      <option value="">Loading accounts...</option>
                    ) : equityAccounts.length === 0 ? (
                      <option value="">No equity accounts available</option>
                    ) : (
                      <>
                        <option value="">Select account...</option>
                        {equityAccounts.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.glAccount && (
                    <p className="text-sm text-red-600 mt-1">{errors.glAccount}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Description <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Auto-filled from bank transaction
                    </span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className={`w-full px-3 py-2 border ${errors.description ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  />
                  <div className="flex justify-between mt-1">
                    <div>
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.description?.length || 0} / 500
                    </p>
                  </div>
                </div>

                {/* Tax Treatment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Treatment (Optional)
                  </label>
                  <select
                    value={formData.taxTreatment || 'tbd'}
                    onChange={(e) => handleChange('taxTreatment', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  >
                    <option value="tbd">To Be Determined</option>
                    <option value="taxable">Taxable</option>
                    <option value="nontaxable">Non-Taxable</option>
                  </select>
                </div>

                {/* Bank Reference (readonly) */}
                {formData.bankReference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Reference
                    </label>
                    <input
                      type="text"
                      value={formData.bankReference}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 rounded-b-lg">
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> Required fields
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white ${typeClasses.button} rounded-lg transition-colors disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create & Match
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
