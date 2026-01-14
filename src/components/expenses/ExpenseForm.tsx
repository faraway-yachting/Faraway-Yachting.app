'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, XCircle, AlertCircle, ChevronDown, Pencil, Printer, Loader2 } from 'lucide-react';
import { VendorSelector } from './VendorSelector';
import { ExpenseLineItemEditor } from './ExpenseLineItemEditor';
import { ExpenseAttachments } from './ExpenseAttachments';
import { RelatedJournalEntries } from '@/components/accounting/RelatedJournalEntries';
import type {
  ExpenseRecord,
  ExpenseLineItem,
  ExpensePricingType,
  ReceiptStatus,
} from '@/data/expenses/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import type { Contact } from '@/data/contact/types';
import type { Attachment } from '@/data/accounting/journalEntryTypes';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { expensesApi } from '@/lib/supabase/api/expenses';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { whtCertificatesApi } from '@/lib/supabase/api/whtCertificates';
import { dbCompanyToFrontend, dbProjectToFrontend, dbContactToFrontend, dbBankAccountToFrontend, frontendExpenseToDb, frontendExpenseLineItemToDb } from '@/lib/supabase/transforms';
import type { BankAccount } from '@/data/banking/types';
import {
  calculateDocumentTotals,
  getTodayISO,
  addDays,
  generateId,
} from '@/lib/expenses/utils';
import { getExchangeRate } from '@/lib/exchangeRate/service';
import type { FxRateSource } from '@/data/exchangeRate/types';
import ExpensePrintView from './ExpensePrintView';
import WhtCertificatePrintView from '@/components/finances/WhtCertificatePrintView';
import type { WhtToSupplier } from '@/data/finances/types';

interface ExpenseFormProps {
  expense?: ExpenseRecord;
  onCancel?: () => void;
}

export default function ExpenseForm({ expense, onCancel }: ExpenseFormProps) {
  const router = useRouter();
  const isEditing = !!expense;

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [vendorContact, setVendorContact] = useState<Contact | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

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
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [fxRateSource, setFxRateSource] = useState<FxRateSource>(
    expense?.fxRateSource || 'bot'
  );
  const [fxRateDate, setFxRateDate] = useState<string | undefined>(
    expense?.fxRateDate
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
  const [paidFromBankAccountId, setPaidFromBankAccountId] = useState<string>('');
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

  // Check if VAT is available for selected company
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;

  // Force "No VAT" if company is not VAT registered
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

  // Load initial data (companies)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const companiesData = await companiesApi.getActive();
        setCompanies(companiesData.map(dbCompanyToFrontend));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load all projects (projects can be assigned from any company in the group)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Get all projects across all companies (active and inactive, not completed)
        // Note: Projects belong to a Company for legal registration, but transactions
        // for P&L calculation can come from any company in the Faraway Yachting group
        const projectsData = await projectsApi.getAll();
        // Filter to show active and inactive projects (not completed)
        const filteredProjects = projectsData.filter(p => p.status !== 'completed');
        setCompanyProjects(filteredProjects.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Load bank accounts when company changes
  useEffect(() => {
    const loadBankAccounts = async () => {
      if (!companyId) {
        setBankAccounts([]);
        return;
      }
      try {
        const accountsData = await bankAccountsApi.getByCompanyActive(companyId);
        setBankAccounts(accountsData.map(dbBankAccountToFrontend));
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
      }
    };
    loadBankAccounts();
  }, [companyId]);

  // Load vendor contact when vendor changes
  useEffect(() => {
    const loadVendorContact = async () => {
      if (!vendorId) {
        setVendorContact(undefined);
        return;
      }
      try {
        const contact = await contactsApi.getById(vendorId);
        if (contact) {
          setVendorContact(dbContactToFrontend(contact));
        }
      } catch (error) {
        console.error('Failed to load vendor contact:', error);
      }
    };
    loadVendorContact();
  }, [vendorId]);

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

  // Auto-fetch exchange rate when currency or expense date changes
  useEffect(() => {
    const fetchRate = async () => {
      // Skip if THB (no conversion needed)
      if (currency === 'THB') {
        setExchangeRate(1);
        return;
      }

      // Skip if no expense date set
      if (!expenseDate) return;

      // Skip if editing and rate already set (user may have manually entered)
      if (isEditing && expense?.fxRate && fxRateSource === 'manual') return;

      setIsFetchingRate(true);
      try {
        const result = await getExchangeRate(currency, expenseDate);
        if (result.success && result.rate) {
          setExchangeRate(result.rate);
          setFxRateSource(result.source || 'bot');
          setFxRateDate(result.date || expenseDate);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchRate();
  }, [currency, expenseDate]);

  // Calculate totals
  const totals = calculateDocumentTotals(lineItems, effectivePricingType);

  // Use vendorContact for WHT certificate
  const selectedVendor = vendorContact;

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

  // Validation
  const validate = (status: 'draft' | 'approved'): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyId) newErrors.companyId = 'Company is required';

    // For approval, check required fields (vendor is optional)
    if (status === 'approved') {
      if (!expenseDate) newErrors.expenseDate = 'Expense date is required';
      if (!paidFromBankAccountId) newErrors.paidFromBankAccountId = 'Bank account is required';

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
      // Generate expense number if new
      const expenseNumber = expense?.expenseNumber || `EXP-${getTodayISO().replace(/-/g, '').slice(2, 6)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Prepare expense data for Supabase
      console.log('[ExpenseForm] Saving with attachments:', attachments);
      const expenseDbData = frontendExpenseToDb({
        companyId,
        expenseNumber,
        vendorId,
        vendorName,
        supplierInvoiceNumber: supplierInvoiceNumber || undefined,
        expenseDate,
        dueDate: dueDate || undefined,
        pricingType: effectivePricingType,
        currency,
        fxRate: currency !== 'THB' ? exchangeRate : undefined,
        fxRateSource: currency !== 'THB' ? fxRateSource : undefined,
        fxBaseCurrency: currency !== 'THB' ? currency : undefined,
        fxTargetCurrency: currency !== 'THB' ? 'THB' : undefined,
        fxRateDate: currency !== 'THB' ? fxRateDate : undefined,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        whtAmount: totals.whtAmount,
        netPayable: totals.netPayable,
        paymentStatus: expense?.paymentStatus || 'unpaid',
        status,
        notes: notes || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdBy: expense?.createdBy || undefined,
      });
      console.log('[ExpenseForm] Expense DB data attachments:', expenseDbData.attachments);

      // Prepare line items for Supabase
      const lineItemsDbData = lineItems.map((item) => frontendExpenseLineItemToDb(item, ''));

      let savedExpenseId: string | undefined;

      if (isEditing && expense) {
        // Update existing expense
        await expensesApi.update(expense.id, expenseDbData);
        await expensesApi.updateLineItems(expense.id, lineItemsDbData.map(li => ({ ...li, expense_id: expense.id })));
        setCurrentStatus(status);
        savedExpenseId = expense.id;
      } else {
        // Create new expense
        const newExpense = await expensesApi.create(expenseDbData, lineItemsDbData);
        savedExpenseId = newExpense.id;
      }

      // Create WHT certificate when expense is approved and has WHT amount
      if (savedExpenseId && status === 'approved' && totals.whtAmount > 0) {
        try {
          const company = companies.find(c => c.id === companyId);
          const companyCode = company?.name?.substring(0, 3).toUpperCase() || 'FYL';

          // Generate certificate number
          const certificateNumber = await whtCertificatesApi.generateCertificateNumber(companyId, companyCode);

          // Format address from billing address JSON if available
          const formatAddress = (addr: { street?: string; city?: string; state?: string; country?: string } | null | undefined): string => {
            if (!addr) return '';
            const parts = [addr.street, addr.city, addr.state, addr.country].filter(Boolean);
            return parts.join(', ');
          };

          // Determine if vendor is a company (PND53) or individual (PND3)
          const isVendorCompany = vendorContact?.taxId?.startsWith('0') ?? true; // Thai company tax IDs start with 0

          // Get tax period from expense date
          const taxPeriod = expenseDate.substring(0, 7); // YYYY-MM format

          // Create WHT certificate
          const certificate = await whtCertificatesApi.create({
            company_id: companyId,
            certificate_number: certificateNumber,
            form_type: isVendorCompany ? 'pnd53' : 'pnd3',
            payer_name: company?.name || '',
            payer_address: formatAddress(company?.billingAddress as { street?: string; city?: string; state?: string; country?: string } | null),
            payer_tax_id: company?.taxId || '',
            payee_vendor_id: vendorId || null,
            payee_name: vendorName,
            payee_address: formatAddress(vendorContact?.billingAddress as { street?: string; city?: string; state?: string; country?: string } | null),
            payee_tax_id: vendorContact?.taxId || null,
            payee_is_company: isVendorCompany,
            payment_date: expenseDate,
            income_type: '40(8)', // Default to "Other services"
            amount_paid: totals.subtotal,
            wht_rate: getEffectiveWhtRate(lineItems),
            wht_amount: totals.whtAmount,
            tax_period: taxPeriod,
            status: 'issued',
            issued_date: getTodayISO(),
          });

          // Link certificate to expense
          await whtCertificatesApi.linkToExpense(certificate.id, savedExpenseId);

          console.log('WHT certificate created:', certificate.certificate_number);
        } catch (whtError) {
          console.error('Failed to create WHT certificate:', whtError);
          // Don't fail the expense save, just log the error
        }
      }

      // Create payment record if bank account is selected
      if (savedExpenseId && paidFromBankAccountId && totals.netPayable > 0) {
        try {
          const paymentRecord = await expensesApi.addPayment({
            expense_id: savedExpenseId,
            payment_date: expenseDate,
            amount: totals.netPayable,
            paid_from: paidFromBankAccountId,
            reference: supplierInvoiceNumber || undefined,
            remark: `Paid from bank account`,
          });

          // Update expense payment status to 'paid'
          await expensesApi.update(savedExpenseId, {
            payment_status: 'paid',
          });

          // Create payment journal entry using event-driven system
          try {
            const { accountingEventsApi } = await import('@/lib/supabase/api/accountingEvents');

            // Get bank account GL code
            const bankAccount = bankAccounts.find(ba => ba.id === paidFromBankAccountId);
            const bankGlCode = bankAccount?.glAccountCode || '1010';

            const paymentEventResult = await accountingEventsApi.createAndProcess(
              'EXPENSE_PAID',
              expenseDate,
              [companyId],
              {
                expenseId: savedExpenseId,
                paymentId: paymentRecord.id,
                expenseNumber,
                vendorName,
                paymentDate: expenseDate,
                paymentAmount: totals.netPayable,
                bankAccountId: paidFromBankAccountId,
                bankAccountGlCode: bankGlCode,
                currency,
              },
              'expense_payment',
              paymentRecord.id
            );

            if (paymentEventResult.success) {
              console.log('Payment event processed, journal IDs:', paymentEventResult.journalEntryIds);
            } else {
              console.warn('Payment event warning:', paymentEventResult.error);
            }
          } catch (journalError) {
            console.error('Failed to create payment event:', journalError);
          }

          console.log('Payment record created for expense:', savedExpenseId);
        } catch (paymentError) {
          console.error('Failed to create payment record:', paymentError);
          // Don't fail the expense save, just log the error
        }
      }

      // Create approval journal entry when expense is approved (using event-driven system)
      if (savedExpenseId && status === 'approved') {
        try {
          const { accountingEventsApi } = await import('@/lib/supabase/api/accountingEvents');

          const approvalEventResult = await accountingEventsApi.createAndProcess(
            'EXPENSE_APPROVED',
            expenseDate,
            [companyId],
            {
              expenseId: savedExpenseId,
              expenseNumber,
              vendorName,
              expenseDate,
              lineItems: lineItems.map(li => ({
                description: li.description,
                accountCode: li.accountCode || null,
                amount: li.preVatAmount || li.amount,
              })),
              totalSubtotal: totals.subtotal,
              totalVatAmount: totals.vatAmount,
              totalAmount: totals.totalAmount,
              currency,
            },
            'expense',
            savedExpenseId
          );

          if (approvalEventResult.success) {
            console.log('Expense approval event processed, journal IDs:', approvalEventResult.journalEntryIds);
          } else {
            console.warn('Expense approval event warning:', approvalEventResult.error);
          }
        } catch (journalError) {
          console.error('Failed to create expense approval event:', journalError);
          // Don't fail the expense save, just log the error
        }
      }

      // Navigate after save
      if (savedExpenseId) {
        if (isEditing) {
          router.push('/accounting/manager/expenses/expense-records');
        } else {
          router.push(`/accounting/manager/expenses/expense-records/${savedExpenseId}`);
        }
      }
    } catch (error: unknown) {
      console.error('Error saving expense:', error);
      // Extract error message from Supabase error
      let errorMessage = 'Failed to save expense. Please try again.';
      if (error && typeof error === 'object') {
        const err = error as { message?: string; details?: string; hint?: string; code?: string };
        if (err.message) errorMessage = err.message;
        if (err.details) errorMessage += `\n\nDetails: ${err.details}`;
        if (err.hint) errorMessage += `\n\nHint: ${err.hint}`;
        console.error('Error details:', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      }
      alert(errorMessage);
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
      // Use void function which also deletes related journal entries
      await expensesApi.void(expense.id, voidReason || undefined);

      setCurrentStatus('void');
      setShowVoidModal(false);
      setVoidReason('');
      router.push('/accounting/manager/expenses/expense-records');
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

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
                              onClick={async () => {
                                setShowOptionsMenu(false);
                                try {
                                  // Fetch WHT certificate linked to this expense
                                  const certificates = await whtCertificatesApi.getByExpense(expense.id);
                                  if (certificates.length === 0) {
                                    alert('No WHT certificate found for this expense. It may not have been paid yet.');
                                    return;
                                  }
                                  // Use the first certificate
                                  const cert = certificates[0];
                                  // Convert to WhtToSupplier format for the print view
                                  const whtData: WhtToSupplier = {
                                    id: cert.id,
                                    date: cert.payment_date,
                                    documentNumber: cert.certificate_number,
                                    documentType: 'payment',
                                    supplierId: cert.payee_vendor_id || '',
                                    supplierName: cert.payee_name,
                                    supplierTaxId: cert.payee_tax_id || '',
                                    companyId: cert.company_id,
                                    companyName: selectedCompany?.name || '',
                                    paymentAmount: cert.amount_paid,
                                    whtType: cert.form_type as 'pnd3' | 'pnd53',
                                    whtRate: cert.wht_rate,
                                    whtAmount: cert.wht_amount,
                                    whtCertificateNumber: cert.certificate_number,
                                    status: cert.status === 'filed' ? 'filed' : cert.status === 'issued' ? 'submitted' : 'pending',
                                    submissionDate: cert.filed_date || undefined,
                                    period: cert.tax_period,
                                    currency: 'THB',
                                  };
                                  setWhtTransaction(whtData);
                                  setShowWhtView(true);
                                } catch (error) {
                                  console.error('Error loading WHT certificate:', error);
                                  alert('Failed to load WHT certificate. Please try again.');
                                }
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
              Vendor
            </label>
            <VendorSelector
              value={vendorId}
              onChange={(id, name) => {
                setVendorId(id);
                setVendorName(name);
              }}
              disabled={!canEdit}
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional for drafts, recommended for approved expenses
            </p>
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
              <div className="relative">
                <input
                  type="number"
                  value={exchangeRate || ''}
                  onChange={(e) => {
                    setExchangeRate(parseFloat(e.target.value) || undefined);
                    setFxRateSource('manual');
                  }}
                  disabled={!canEdit || isFetchingRate}
                  step="0.0001"
                  placeholder="e.g., 35.50"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {isFetchingRate && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#5A7A8F]" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                1 {currency} = {exchangeRate ? exchangeRate.toFixed(4) : '?'} THB
                {fxRateSource === 'bot' && !isFetchingRate && (
                  <span className="ml-2 text-green-600">• Bank of Thailand ({fxRateDate || expenseDate})</span>
                )}
                {fxRateSource === 'fallback' && !isFetchingRate && (
                  <span className="ml-2 text-amber-600">• Frankfurt fallback ({fxRateDate || expenseDate})</span>
                )}
                {fxRateSource === 'api' && !isFetchingRate && (
                  <span className="ml-2 text-green-600">• API rate ({fxRateDate || expenseDate})</span>
                )}
                {fxRateSource === 'manual' && !isFetchingRate && (
                  <span className="ml-2 text-gray-600">• Manual rate</span>
                )}
              </p>
              {exchangeRate && totals.totalAmount > 0 && (
                <p className="mt-1 text-xs font-medium text-[#5A7A8F]">
                  THB Total: ฿{(totals.totalAmount * exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              )}
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

          {/* Paid From Bank Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paid From Bank Account <span className="text-red-500">*</span>
            </label>
            <select
              value={paidFromBankAccountId}
              onChange={(e) => setPaidFromBankAccountId(e.target.value)}
              disabled={!canEdit || !companyId}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.paidFromBankAccountId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select bank account...</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} - {account.bankInformation?.bankName} ({account.currency})
                </option>
              ))}
            </select>
            {errors.paidFromBankAccountId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.paidFromBankAccountId}
              </p>
            )}
            {!companyId && !errors.paidFromBankAccountId && (
              <p className="mt-1 text-xs text-gray-500">
                Select a company first to load bank accounts
              </p>
            )}
            {companyId && bankAccounts.length === 0 && !errors.paidFromBankAccountId && (
              <p className="mt-1 text-xs text-amber-600">
                No bank accounts found for this company
              </p>
            )}
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
            projects={companyProjects}
            readOnly={!canEdit}
            exchangeRate={exchangeRate}
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
          expenseId={expense?.id}
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

      {/* Related Journal Entries - Only show for existing expenses */}
      {isEditing && expense && (
        <RelatedJournalEntries
          documentType="expense"
          documentId={expense.id}
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
