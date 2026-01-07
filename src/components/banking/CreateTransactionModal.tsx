'use client';

import { useState, useEffect } from 'react';
import { X, Info, Plus } from 'lucide-react';
import {
  BankFeedLine,
  BankMatch,
  TransactionType,
} from '@/data/banking/bankReconciliationTypes';
import { getAllBankAccounts } from '@/data/banking/bankAccounts';
import { getAllProjects } from '@/data/banking/projects';

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: TransactionType | null;
  selectedLine: BankFeedLine | undefined;
  onCreateMatch: (match: Partial<BankMatch>) => void;
}

// Utility function to generate placeholder IDs
function generatePlaceholderId(type: TransactionType): string {
  const prefix = {
    'receipt': 'RCP',
    'expense': 'EXP',
    'transfer': 'TRF',
    'owner_contribution': 'OWN',
    'bank_fee': 'FEE',
    'interest': 'INT',
    'refund': 'REF',
  };
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix[type]}-${date}-${random}`;
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

// GL Account options
const revenueAccounts = [
  { code: '4000', name: 'Sales Revenue' },
  { code: '4100', name: 'Service Revenue' },
  { code: '4200', name: 'Charter Revenue' },
  { code: '4900', name: 'Other Revenue' },
];

const expenseAccounts = [
  { code: '6000', name: 'Operating Expenses' },
  { code: '6100', name: 'Fuel Costs' },
  { code: '6200', name: 'Marina Fees' },
  { code: '6300', name: 'Maintenance & Repairs' },
  { code: '6400', name: 'Supplies' },
  { code: '6500', name: 'Professional Services' },
  { code: '6900', name: 'Other Expenses' },
];

const equityAccounts = [
  { code: '3100', name: 'Owner Capital' },
  { code: '3200', name: 'Owner Drawings' },
];

const expenseCategories = [
  'Fuel',
  'Marina Fees',
  'Maintenance',
  'Supplies',
  'Professional Services',
  'Other',
];

export function CreateTransactionModal({
  isOpen,
  onClose,
  transactionType,
  selectedLine,
  onCreateMatch,
}: CreateTransactionModalProps) {
  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available bank accounts and projects
  const allBankAccounts = getAllBankAccounts();
  const allProjects = getAllProjects();

  // Filter projects by selected line's company
  const availableProjects = selectedLine
    ? allProjects.filter((p) => p.companyId === selectedLine.companyId && p.status === 'active')
    : [];

  // Filter bank accounts for transfers (same company, excluding current account)
  const availableTransferAccounts = selectedLine
    ? allBankAccounts.filter(
        (acc) => acc.companyId === selectedLine.companyId && acc.id !== selectedLine.bankAccountId
      )
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
        defaultData.glAccount = '4000';
      } else if (transactionType === 'expense') {
        defaultData.glAccount = '6000';
        defaultData.expenseCategory = 'Other';
      } else if (transactionType === 'transfer') {
        defaultData.fromAccount = selectedLine.bankAccountId;
        defaultData.transferType = 'internal';
      } else if (transactionType === 'owner_contribution') {
        // Auto-select type based on amount sign
        const isContribution = selectedLine.amount > 0;
        defaultData.ownerType = isContribution ? 'contribution' : 'draw';
        defaultData.glAccount = isContribution ? '3100' : '3200';
        defaultData.taxTreatment = 'tbd';
      }

      setFormData(defaultData);
      setErrors({});
    }
  }, [isOpen, selectedLine, transactionType, remainingAmount]);

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
      setFormData((prev) => ({
        ...prev,
        glAccount: value === 'contribution' ? '3100' : '3200',
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
    if (new Date(formData.date) > new Date()) {
      newErrors.date = 'Date cannot be in the future';
    }
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    // Type-specific validations
    if (transactionType === 'receipt') {
      if (!formData.counterparty || formData.counterparty.trim() === '') {
        newErrors.counterparty = 'Customer name is required';
      }
      if (!formData.glAccount) {
        newErrors.glAccount = 'GL Account is required';
      }
    } else if (transactionType === 'expense') {
      if (!formData.supplier || formData.supplier.trim() === '') {
        newErrors.supplier = 'Supplier name is required';
      }
      if (!formData.glAccount) {
        newErrors.glAccount = 'GL Account is required';
      }
      if (!formData.expenseCategory) {
        newErrors.expenseCategory = 'Expense category is required';
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

  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Create match object
    const match: Partial<BankMatch> = {
      bankFeedLineId: selectedLine.id,
      systemRecordType: transactionType,
      systemRecordId: generatePlaceholderId(transactionType),
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
                Match bank transaction to new {transactionType.replace('_', ' ')} record
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
                  <input
                    type="text"
                    value={formData.counterparty || ''}
                    onChange={(e) => handleChange('counterparty', e.target.value)}
                    placeholder="e.g., John Doe, Yacht Charter Co."
                    className={`w-full px-3 py-2 border ${errors.counterparty ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
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
                    Project (Optional)
                  </label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => handleChange('projectId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}"
                  >
                    <option value="">Select project...</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GL Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GL Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.glAccount || ''}
                    onChange={(e) => handleChange('glAccount', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.glAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    {revenueAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}"
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
                  <input
                    type="text"
                    value={formData.supplier || ''}
                    onChange={(e) => handleChange('supplier', e.target.value)}
                    placeholder="e.g., Marina Services, Fuel Supplier"
                    className={`w-full px-3 py-2 border ${errors.supplier ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
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
                    Project (Optional)
                  </label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => handleChange('projectId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}"
                  >
                    <option value="">Select project...</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expense Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.expenseCategory || ''}
                    onChange={(e) => handleChange('expenseCategory', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors.expenseCategory ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.expenseCategory && (
                    <p className="text-sm text-red-600 mt-1">{errors.expenseCategory}</p>
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
                    className={`w-full px-3 py-2 border ${errors.glAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    {expenseAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}"
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
                    value={allBankAccounts.find((a) => a.id === formData.fromAccount)?.accountName || ''}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}"
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
                    className={`w-full px-3 py-2 border ${errors.glAccount ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}`}
                  >
                    {equityAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent ${typeClasses.focus}"
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
