'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, XCircle, AlertCircle, ChevronDown, Pencil, Printer } from 'lucide-react';
import { VendorSelector } from './VendorSelector';
import { ExpenseLineItemEditor } from './ExpenseLineItemEditor';
import { ExpenseAttachments } from './ExpenseAttachments';
import type {
  ExpenseRecord,
  ExpenseLineItem,
  ExpensePricingType,
  ReceiptStatus,
} from '@/data/expenses/types';
import type { Currency } from '@/data/company/types';
import type { Attachment } from '@/data/accounting/journalEntryTypes';
import { getActiveCompanies } from '@/data/company/companies';
import { createExpenseRecord, updateExpenseRecord, createWhtCertificate } from '@/data/expenses/expenses';
import { getActiveProjectsByCompany } from '@/data/project/projects';
import { getContactById } from '@/data/contact/contacts';
import {
  calculateDocumentTotals,
  getTodayISO,
  addDays,
  generateId,
} from '@/lib/expenses/utils';
import ExpensePrintView from './ExpensePrintView';
import WhtCertificatePrintView from '@/components/finances/WhtCertificatePrintView';
import { getCompanyById } from '@/data/company/companies';
import { getWhtToSupplierByExpenseId } from '@/data/finances/mockWhtToSupplier';
import type { WhtToSupplier } from '@/data/finances/types';

interface ExpenseFormProps {
  expense?: ExpenseRecord;
  onCancel?: () => void;
}

export default function ExpenseForm({ expense, onCancel }: ExpenseFormProps) {
  const router = useRouter();
  const isEditing = !!expense;

  // Get available companies
  const companies = getActiveCompanies();

  // Form state
  const [companyId, setCompanyId] = useState(expense?.companyId || '');
  const [vendorId, setVendorId] = useState(expense?.vendorId || '');
  const [vendorName, setVendorName] = useState(expense?.vendorName || '');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState(
    expense?.supplierInvoiceNumber || ''
  );
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(
    expense?.supplierInvoiceDate || ''
  );
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate || getTodayISO());
  const [dueDate, setDueDate] = useState(expense?.dueDate || addDays(getTodayISO(), 30));
  const [currency, setCurrency] = useState<Currency>(expense?.currency || 'THB');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(
    expense?.fxRate
  );
  const [pricingType, setPricingType] = useState<ExpensePricingType>(
    expense?.pricingType || 'exclude_vat'
  );

  // Initialize with 1 default line item for new expenses
  const getInitialLineItems = (): ExpenseLineItem[] => {
    if (expense?.lineItems) return expense.lineItems;
    return [{
      id: generateId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 7, // Default VAT rate, will be updated by useEffect if no_vat
      whtRate: 0,
      whtBaseCalculation: 'pre_vat',
      customWhtAmount: undefined,
      amount: 0,
      preVatAmount: 0,
      whtAmount: 0,
      projectId: '',
      accountCode: '',
    }];
  };

  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>(getInitialLineItems);
  const [notes, setNotes] = useState(expense?.notes || '');
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>(
    expense?.receiptStatus || 'pending'
  );
  const [attachments, setAttachments] = useState<Attachment[]>(expense?.attachments || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(expense?.status || 'draft');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showWhtView, setShowWhtView] = useState(false);
  const [whtTransaction, setWhtTransaction] = useState<WhtToSupplier | null>(null);

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === companyId);

  // Get all projects (expenses have project per line, not per document)
  const allProjects = companyId ? getActiveProjectsByCompany(companyId) : [];

  // Check if VAT is available for selected company
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;

  // Force "No VAT" if company is not VAT registered
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showOptionsMenu) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showOptionsMenu]);

  // Update line items tax rate when pricing type changes to 'no_vat'
  useEffect(() => {
    if (effectivePricingType === 'no_vat') {
      setLineItems(prev => prev.map(item => ({
        ...item,
        taxRate: 0,
      })));
    }
  }, [effectivePricingType]);

  // Calculate totals
  const totals = calculateDocumentTotals(lineItems, effectivePricingType);

  // Get vendor details for WHT certificate
  const selectedVendor = vendorId ? getContactById(vendorId) : undefined;

  // Helper to get the effective WHT rate from line items
  const getEffectiveWhtRate = (items: ExpenseLineItem[]): number => {
    const whtRates = items
      .filter(item => item.whtRate !== 0 && item.whtRate !== 'custom')
      .map(item => item.whtRate as number);

    if (whtRates.length === 0) return 3; // Default 3%

    // Return most frequent rate
    const rateCount = whtRates.reduce((acc, rate) => {
      acc[rate] = (acc[rate] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Number(Object.entries(rateCount).sort((a, b) => b[1] - a[1])[0][0]);
  };

  // Format address for WHT certificate
  const formatAddress = (address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string }): string => {
    if (!address) return '';
    const parts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
    return parts.join(', ');
  };

  // Validation
  const validate = (status: 'draft' | 'approved'): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyId) newErrors.companyId = 'Company is required';

    // For approval, vendor is required
    if (status === 'approved') {
      if (!vendorId) newErrors.vendorId = 'Vendor is required';
      if (!expenseDate) newErrors.expenseDate = 'Expense date is required';

      // Check line items
      if (lineItems.length === 0) {
        newErrors.lineItems = 'At least one line item is required';
      } else {
        // Check if all line items have projects
        const missingProjects = lineItems.filter((item) => !item.projectId);
        if (missingProjects.length > 0) {
          newErrors.lineItems = 'All line items must have a project selected';
        }
      }
    }

    // Date validation
    if (dueDate && expenseDate && dueDate < expenseDate) {
      newErrors.dueDate = 'Due date must be on or after expense date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async (status: 'draft' | 'approved') => {
    setErrors({});

    if (!validate(status)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      const expenseData = {
        companyId,
        vendorId,
        vendorName,
        supplierInvoiceNumber: supplierInvoiceNumber || undefined,
        supplierInvoiceDate: supplierInvoiceDate || undefined,
        expenseDate,
        dueDate: dueDate || undefined,
        pricingType: effectivePricingType,
        currency,
        exchangeRate: currency !== 'THB' ? exchangeRate : undefined,
        lineItems,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        whtAmount: totals.whtAmount,
        netPayable: totals.netPayable,
        paymentStatus: expense?.paymentStatus || 'unpaid' as const,
        amountPaid: expense?.amountPaid || 0,
        amountOutstanding: totals.netPayable - (expense?.amountPaid || 0),
        receiptStatus,
        attachments: attachments.length > 0 ? attachments : undefined,
        status,
        approvedDate: status === 'approved' ? getTodayISO() : undefined,
        notes: notes || undefined,
        createdBy: expense?.createdBy || 'current-user',
      };

      let savedExpenseId: string | undefined;

      if (isEditing && expense) {
        const updated = updateExpenseRecord(expense.id, expenseData);
        if (updated) {
          setCurrentStatus(status);
          savedExpenseId = expense.id;
        }
      } else {
        const newExpense = createExpenseRecord(expenseData);
        if (newExpense) {
          savedExpenseId = newExpense.id;
        }
      }

      // Auto-create WHT certificate when approving with WHT > 0
      if (savedExpenseId && status === 'approved' && totals.whtAmount > 0) {
        const expenseDateObj = new Date(expenseDate);
        const taxPeriod = `${expenseDateObj.getFullYear()}-${String(expenseDateObj.getMonth() + 1).padStart(2, '0')}`;

        createWhtCertificate({
          formType: 'pnd53', // Default for company payee
          payerCompanyId: companyId,
          payerName: selectedCompany?.name || '',
          payerAddress: formatAddress(selectedCompany?.registeredAddress),
          payerTaxId: selectedCompany?.taxId || '',
          payeeVendorId: vendorId,
          payeeName: vendorName,
          payeeAddress: formatAddress(selectedVendor?.billingAddress),
          payeeTaxId: selectedVendor?.taxId || '',
          payeeIsCompany: true, // Default to company
          paymentDate: expenseDate,
          incomeType: '40(7)', // Default: รับเหมา/Contracting (most common for expenses)
          amountPaid: totals.subtotal,
          whtRate: getEffectiveWhtRate(lineItems),
          whtAmount: totals.whtAmount,
          taxPeriod,
          expenseRecordIds: [savedExpenseId],
          status: 'draft',
          createdBy: 'current-user',
        }, 'FYL');
      }

      // Navigate after save
      if (savedExpenseId) {
        if (isEditing) {
          router.push('/accounting/manager/expenses/expense-records');
        } else {
          router.push(`/accounting/manager/expenses/expense-records/${savedExpenseId}`);
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/expenses/expense-records');
    }
  };

  // Handle void expense
  const handleVoid = async () => {
    if (!expense) return;

    setIsSaving(true);
    try {
      const updated = updateExpenseRecord(expense.id, {
        status: 'void',
        voidedDate: getTodayISO(),
        voidReason: voidReason || undefined,
      });

      if (updated) {
        setCurrentStatus('void');
        setShowVoidModal(false);
        setVoidReason('');
        router.push('/accounting/manager/expenses/expense-records');
      }
    } catch (error) {
      console.error('Error voiding expense:', error);
      alert('Failed to void expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isVoided = currentStatus === 'void';
  const isApproved = currentStatus === 'approved';
  const canEdit = !isVoided && (!isApproved || isEditingApproved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-[#5A7A8F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Expense' : 'New Expense'}
            </h1>
            {isEditing && expense && (
              <p className="text-sm text-gray-500 mt-0.5">{expense.expenseNumber}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* NEW DOCUMENT: Cancel, Save Draft, Approve */}
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave('approved')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Approve'}</span>
              </button>
            </>
          )}

          {/* EXISTING DOCUMENT */}
          {isEditing && (
            <>
              {/* Voided badge */}
              {isVoided && (
                <span className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  Voided
                </span>
              )}

              {/* Approved badge with Options */}
              {isApproved && !isVoided && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg">
                    Approved
                  </span>
                  {!isEditingApproved && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsMenu(!showOptionsMenu);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Options
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {showOptionsMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPrintView(true);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Printer className="h-4 w-4" />
                            Print PDF
                          </button>
                          {totals.whtAmount > 0 && expense && (
                            <button
                              type="button"
                              onClick={() => {
                                const whtRecords = getWhtToSupplierByExpenseId(expense.id);
                                if (whtRecords.length > 0) {
                                  setWhtTransaction(whtRecords[0]);
                                  setShowWhtView(true);
                                }
                                setShowOptionsMenu(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              View WHT Form
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingApproved(true);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowVoidModal(true);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Void
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Save and Approve buttons - show when can edit */}
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSave('draft')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave('approved')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    <span>Approve</span>
                  </button>

                  {/* Options dropdown - show only for draft expenses (not when editing approved) */}
                  {!isEditingApproved && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptionsMenu(!showOptionsMenu);
                        }}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Options</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      {showOptionsMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPrintView(true);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Printer className="h-4 w-4" />
                            <span>Print PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOptionsMenu(false);
                              setShowVoidModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Void</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document Details Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Document Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!canEdit}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.companyId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="mt-1 text-xs text-red-600">{errors.companyId}</p>
            )}
          </div>

          {/* Vendor Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor <span className="text-red-500">*</span>
            </label>
            <VendorSelector
              value={vendorId}
              onChange={(id, name) => {
                setVendorId(id);
                setVendorName(name);
              }}
              required
              disabled={!canEdit}
            />
            {errors.vendorId && (
              <p className="mt-1 text-xs text-red-600">{errors.vendorId}</p>
            )}
          </div>

          {/* Supplier Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Invoice #
            </label>
            <input
              type="text"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g., INV-12345"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Supplier Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Invoice Date
            </label>
            <input
              type="date"
              value={supplierInvoiceDate}
              onChange={(e) => setSupplierInvoiceDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Expense Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              disabled={!canEdit}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.expenseDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.expenseDate && (
              <p className="mt-1 text-xs text-red-600">{errors.expenseDate}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!canEdit}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.dueDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
            )}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              disabled={!canEdit}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="THB">THB - Thai Baht</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="SGD">SGD - Singapore Dollar</option>
              <option value="AED">AED - UAE Dirham</option>
            </select>
          </div>

          {/* Exchange Rate (for non-THB) */}
          {currency !== 'THB' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exchange Rate to THB
              </label>
              <input
                type="number"
                value={exchangeRate || ''}
                onChange={(e) =>
                  setExchangeRate(parseFloat(e.target.value) || undefined)
                }
                disabled={!canEdit}
                step="0.0001"
                placeholder="e.g., 35.50"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                1 {currency} = ? THB
              </p>
            </div>
          )}

          {/* Receipt Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Status
            </label>
            <select
              value={receiptStatus}
              onChange={(e) => setReceiptStatus(e.target.value as ReceiptStatus)}
              disabled={!canEdit}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="not_required">Not Required</option>
            </select>
          </div>
        </div>

        {/* Pricing Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pricing Type
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="exclude_vat"
                checked={effectivePricingType === 'exclude_vat'}
                onChange={(e) => setPricingType(e.target.value as ExpensePricingType)}
                disabled={!isVatAvailable || !canEdit}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span
                className={`text-sm ${
                  !isVatAvailable || !canEdit ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                Exclude VAT (prices net, VAT added)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="include_vat"
                checked={effectivePricingType === 'include_vat'}
                onChange={(e) => setPricingType(e.target.value as ExpensePricingType)}
                disabled={!isVatAvailable || !canEdit}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span
                className={`text-sm ${
                  !isVatAvailable || !canEdit ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                Include VAT (prices gross, VAT extracted)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="no_vat"
                checked={effectivePricingType === 'no_vat'}
                onChange={(e) => setPricingType(e.target.value as ExpensePricingType)}
                disabled={!canEdit}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${!canEdit ? 'text-gray-400' : 'text-gray-700'}`}>
                No VAT
              </span>
            </label>
          </div>
          {!isVatAvailable && (
            <p className="mt-2 text-xs text-amber-600">
              Selected company is not VAT registered. Only "No VAT" mode is available.
            </p>
          )}
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Line Items {lineItems.length > 0 && `(${lineItems.length})`}
        </h2>

        {!companyId && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Please select a company first to load available projects.
            </p>
          </div>
        )}

        {companyId && (
          <ExpenseLineItemEditor
            lineItems={lineItems}
            onChange={setLineItems}
            pricingType={effectivePricingType}
            currency={currency}
            projects={allProjects}
            readOnly={!canEdit}
          />
        )}

        {errors.lineItems && (
          <p className="text-sm text-red-600">{errors.lineItems}</p>
        )}
      </div>

      {/* Attachments Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Attachments
        </h2>

        <ExpenseAttachments
          attachments={attachments}
          onChange={setAttachments}
          readOnly={!canEdit}
          label="Document Attachments"
          description="Upload supplier invoices, receipts, or supporting documents"
        />
      </div>

      {/* Notes Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Additional Information
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
            rows={3}
            placeholder="Internal notes about this expense..."
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoidModal(false)}
          />

          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Void Expense</h3>
                <p className="text-sm text-gray-500">{expense?.expenseNumber}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this expense? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this expense..."
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowVoidModal(false);
                  setVoidReason('');
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Voiding...' : 'Void Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintView && expense && (
        <ExpensePrintView
          expense={{
            ...expense,
            companyId,
            vendorId,
            vendorName,
            supplierInvoiceNumber: supplierInvoiceNumber || undefined,
            supplierInvoiceDate: supplierInvoiceDate || undefined,
            expenseDate,
            dueDate: dueDate || undefined,
            pricingType: effectivePricingType,
            currency,
            lineItems,
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            totalAmount: totals.totalAmount,
            whtAmount: totals.whtAmount,
            netPayable: totals.netPayable,
            notes: notes || undefined,
          }}
          company={selectedCompany}
          vendor={selectedVendor}
          createdBy={expense.createdBy}
          approvedBy={expense.approvedBy}
          isOpen={showPrintView}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* WHT Certificate Print View Modal */}
      {whtTransaction && (
        <WhtCertificatePrintView
          transaction={whtTransaction}
          company={selectedCompany}
          supplier={selectedVendor}
          isOpen={showWhtView}
          onClose={() => {
            setShowWhtView(false);
            setWhtTransaction(null);
          }}
        />
      )}
    </div>
  );
}
