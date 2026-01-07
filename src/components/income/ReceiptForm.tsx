'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Share2, ChevronDown, Pencil } from 'lucide-react';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import PaymentRecordEditor from './PaymentRecordEditor';
import ReceiptPrintView from './ReceiptPrintView';
import AccountSelector from '@/components/common/AccountSelector';
import type { Receipt, PaymentRecord, AdjustmentType, LineItem, PricingType } from '@/data/income/types';
import type { Currency } from '@/data/company/types';
import { getActiveCompanies } from '@/data/company/companies';
import { getInvoiceById } from '@/data/income/invoices';
import { createReceipt, updateReceipt, calculateReceiptTotals, getReceiptsByCompany } from '@/data/income/receipts';
import { getActiveBankAccountsByCompany } from '@/data/banking/bankAccounts';
import { getContactById } from '@/data/contact/contacts';
import { getActiveProjectsByCompany } from '@/data/project/projects';
import {
  getTodayISO,
  generateId,
  formatCurrency,
  generateReceiptNumber,
  calculateDocumentTotals,
  calculateLineItemTotal,
  calculateTotalWhtAmount
} from '@/lib/income/utils';
import { getDefaultTermsAndConditions } from '@/data/settings/pdfSettings';

interface ReceiptFormProps {
  receipt?: Receipt;
  invoiceId?: string; // For pre-filling from invoice
  onCancel?: () => void;
}

export default function ReceiptForm({ receipt, invoiceId, onCancel }: ReceiptFormProps) {
  const router = useRouter();
  const isEditing = !!receipt;

  // Get available companies
  const companies = getActiveCompanies();

  // Get invoice data if creating from invoice
  const sourceInvoice = invoiceId ? getInvoiceById(invoiceId) : undefined;

  // Form state - initialized from receipt, invoice, or defaults
  const [companyId, setCompanyId] = useState(
    receipt?.companyId || sourceInvoice?.companyId || ''
  );
  const [clientId, setClientId] = useState(
    receipt?.clientId || sourceInvoice?.clientId || ''
  );
  const [clientName, setClientName] = useState(
    receipt?.clientName || sourceInvoice?.clientName || ''
  );
  const [receiptDate, setReceiptDate] = useState(
    receipt?.receiptDate || getTodayISO()
  );
  const [currency, setCurrency] = useState<Currency>(
    receipt?.currency || sourceInvoice?.currency || 'USD'
  );

  // Receipt number - generate if new, use existing if editing
  const initialReceiptNumber = receipt?.receiptNumber || '';
  const [receiptNumber, setReceiptNumber] = useState(initialReceiptNumber);

  // Reference - set to invoice number when creating from invoice
  const [reference, setReference] = useState(
    receipt?.reference || sourceInvoice?.invoiceNumber || ''
  );

  // Pricing type
  const [pricingType, setPricingType] = useState<PricingType>(
    receipt?.pricingType || sourceInvoice?.pricingType || 'exclude_vat'
  );

  // Line items - copy from invoice if creating from invoice
  const [lineItems, setLineItems] = useState<LineItem[]>(
    receipt?.lineItems ||
    sourceInvoice?.lineItems?.map(item => ({ ...item, id: generateId() })) ||
    [
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 7,
        whtRate: 0,
        customWhtAmount: undefined,
        amount: 0,
        accountCode: '',
        projectId: '',
      },
    ]
  );

  // Payment records
  const [payments, setPayments] = useState<PaymentRecord[]>(
    receipt?.payments || []
  );

  // Fee/Adjustment
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(
    receipt?.adjustmentType || 'none'
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState(
    receipt?.adjustmentAmount || 0
  );
  const [adjustmentAccountCode, setAdjustmentAccountCode] = useState(
    receipt?.adjustmentAccountCode || ''
  );
  const [adjustmentRemark, setAdjustmentRemark] = useState(
    receipt?.adjustmentRemark || ''
  );

  // Notes
  const [notes, setNotes] = useState(
    receipt?.notes || (isEditing ? '' : getDefaultTermsAndConditions('invoice'))
  );
  const [internalNotes, setInternalNotes] = useState(receipt?.internalNotes || '');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(receipt?.status || 'draft');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === companyId);

  // Get bank accounts for selected company
  const companyBankAccounts = companyId ? getActiveBankAccountsByCompany(companyId) : [];

  // Get active projects for selected company
  const companyProjects = companyId ? getActiveProjectsByCompany(companyId) : [];

  // Get client contact for print view
  const clientContact = clientId ? getContactById(clientId) : undefined;

  // Check if VAT is available for selected company
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;

  // Force "No VAT" if company is not VAT registered
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

  // Calculate document totals
  const documentTotals = calculateDocumentTotals(lineItems, effectivePricingType);
  const whtAmount = calculateTotalWhtAmount(lineItems, effectivePricingType);
  const netAmountToPay = documentTotals.totalAmount - whtAmount;

  // Calculate receipt totals (payments + adjustments)
  const receiptTotals = calculateReceiptTotals(payments, adjustmentType, adjustmentAmount, netAmountToPay);

  // Generate receipt number when company changes (for new receipts)
  useEffect(() => {
    if (!isEditing && companyId) {
      const companyReceipts = getReceiptsByCompany(companyId);
      const newNumber = generateReceiptNumber(companyId, companyReceipts.length);
      setReceiptNumber(newNumber);
    }
  }, [companyId, isEditing]);

  // Initialize payments with net amount when creating from invoice
  useEffect(() => {
    if (sourceInvoice && payments.length === 0) {
      setPayments([{
        id: generateId(),
        paymentDate: getTodayISO(),
        amount: Math.round(netAmountToPay * 100) / 100,
        receivedAt: '',
        remark: '',
      }]);
    }
  }, [sourceInvoice, netAmountToPay, payments.length]);

  // Recalculate line items when pricing type changes
  useEffect(() => {
    if (lineItems.length > 0) {
      const updatedItems = lineItems.map((item) => ({
        ...item,
        amount: calculateLineItemTotal(
          item.quantity,
          item.unitPrice,
          item.taxRate,
          effectivePricingType
        ),
      }));
      setLineItems(updatedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePricingType]);

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

  // Handle save
  const handleSave = async (status: 'draft' | 'paid') => {
    // Clear previous errors
    setErrors({});

    // For "Approve" (paid status), do full validation
    if (status === 'paid') {
      const newErrors: Record<string, string> = {};

      if (!companyId) newErrors.companyId = 'Company is required';
      if (!clientId) newErrors.clientId = 'Customer is required';
      if (!receiptDate) newErrors.receiptDate = 'Receipt date is required';

      // Check line items
      const hasValidLineItems = lineItems.some(
        (item) => item.description.trim() !== '' && item.unitPrice > 0
      );
      if (!hasValidLineItems) {
        newErrors.lineItems = 'At least one line item with description and amount is required';
      }

      // Check payments
      if (payments.length === 0) {
        newErrors.payments = 'At least one payment record is required';
      } else {
        payments.forEach((payment, index) => {
          if (payment.amount <= 0) {
            newErrors[`payment_${index}_amount`] = 'Amount must be greater than 0';
          }
          if (!payment.receivedAt) {
            newErrors[`payment_${index}_receivedAt`] = 'Select where payment was received';
          }
        });
      }

      // Check adjustment
      if (adjustmentType !== 'none' && adjustmentAmount > 0 && !adjustmentAccountCode) {
        newErrors.adjustmentAccountCode = 'Select an account for the adjustment';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // For draft, only require company
    if (status === 'draft') {
      if (!companyId) {
        setErrors({ companyId: 'Company is required' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const receiptData: Partial<Receipt> = {
        companyId,
        clientId,
        clientName,
        receiptNumber: receiptNumber || undefined,
        receiptDate,
        reference: reference || undefined,
        lineItems,
        pricingType: effectivePricingType,
        subtotal: documentTotals.subtotal,
        taxAmount: documentTotals.taxAmount,
        whtAmount,
        totalAmount: documentTotals.totalAmount,
        payments,
        adjustmentType,
        adjustmentAmount: adjustmentType !== 'none' ? adjustmentAmount : 0,
        adjustmentAccountCode: adjustmentType !== 'none' ? adjustmentAccountCode : undefined,
        adjustmentRemark: adjustmentType !== 'none' ? adjustmentRemark : undefined,
        netAmountToPay,
        totalPayments: receiptTotals.totalPayments,
        totalReceived: receiptTotals.totalReceived,
        remainingAmount: receiptTotals.remainingAmount,
        currency,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        status,
        paidDate: status === 'paid' ? getTodayISO() : undefined,
      };

      // Create or update receipt
      if (isEditing && receipt) {
        const updated = updateReceipt(receipt.id, receiptData);
        console.log('Updated receipt:', updated);
        if (updated) {
          setCurrentStatus(status);
          setIsEditMode(false); // Switch to view mode after save
        }
      } else {
        const newReceipt = createReceipt(receiptData);
        console.log('Created receipt:', newReceipt);
        // Navigate to edit page for the newly created receipt
        if (newReceipt) {
          router.push(`/accounting/manager/income/receipts/${newReceipt.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Failed to save receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/income/receipts');
    }
  };

  // Handle print/export PDF
  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  // Handle share PDF
  const handleShare = () => {
    alert('Share functionality coming soon! This will allow you to share the PDF via email or other channels.');
  };

  // Handle void receipt
  const handleVoid = async () => {
    if (!receipt) return;

    setIsSaving(true);
    try {
      const updated = updateReceipt(receipt.id, {
        status: 'void',
        voidedDate: getTodayISO(),
        voidReason: voidReason || undefined,
        internalNotes: voidReason ? `${internalNotes}\n\nVoid Reason: ${voidReason}` : internalNotes,
      });

      if (updated) {
        setCurrentStatus('void');
        setShowVoidModal(false);
        setVoidReason('');
        router.push('/accounting/manager/income/receipts');
      }
    } catch (error) {
      console.error('Error voiding receipt:', error);
      alert('Failed to void receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if document is voided
  const isVoided = currentStatus === 'void';

  // Check if fields should be disabled (view mode for saved documents)
  const isFieldsDisabled = (isEditing && !isEditMode) || isVoided;

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
              {isEditing ? 'Edit Receipt' : 'New Receipt'}
            </h1>
            {isEditing && receipt && (
              <p className="text-sm text-gray-500 mt-0.5">{receipt.receiptNumber}</p>
            )}
            {sourceInvoice && !isEditing && (
              <p className="text-sm text-gray-500 mt-0.5">
                From Invoice: {sourceInvoice.invoiceNumber}
              </p>
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
                onClick={() => handleSave('paid')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Approve'}</span>
              </button>
            </>
          )}

          {/* SAVED DOCUMENT: Print, Share, Options dropdown */}
          {isEditing && (
            <>
              {/* Print button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isSaving || !companyId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isSaving || !companyId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>

              {/* Edit/Save toggle - only when not voided */}
              {!isVoided && (
                isEditMode ? (
                  <button
                    type="button"
                    onClick={() => handleSave(currentStatus === 'draft' ? 'draft' : 'paid')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )
              )}

              {/* Voided badge */}
              {isVoided && (
                <span className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  Voided
                </span>
              )}

              {/* Options dropdown - show when not voided */}
              {!isVoided && (
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
                      {/* Credit Note option - only for paid receipts */}
                      {currentStatus === 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            router.push(`/accounting/manager/income/credit-notes/new?from=${receipt?.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Credit Note</span>
                        </button>
                      )}

                      {/* Debit Note option - only for paid receipts */}
                      {currentStatus === 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            router.push(`/accounting/manager/income/debit-notes/new?from=${receipt?.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Debit Note</span>
                        </button>
                      )}

                      {/* Void option */}
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
        </div>
      </div>

      {/* Document Details Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Document Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Company Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={isFieldsDisabled}
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

          {/* Receipt Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Number
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to auto-generate</p>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Invoice number, PO number"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Customer Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <ClientSelector
              value={clientId}
              onChange={(id, name) => {
                setClientId(id);
                setClientName(name);
              }}
              required
              disabled={isFieldsDisabled}
            />
            {errors.clientId && (
              <p className="mt-1 text-xs text-red-600">{errors.clientId}</p>
            )}
          </div>

          {/* Receipt Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.receiptDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.receiptDate && (
              <p className="mt-1 text-xs text-red-600">{errors.receiptDate}</p>
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
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="THB">THB - Thai Baht</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="SGD">SGD - Singapore Dollar</option>
            </select>
          </div>

          {/* Pricing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Setting
            </label>
            <select
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value as PricingType)}
              disabled={!isVatAvailable || isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="exclude_vat">Exclude VAT (Add VAT to total)</option>
              <option value="include_vat">Include VAT (VAT included in prices)</option>
              <option value="no_vat">No VAT</option>
            </select>
            {!isVatAvailable && (
              <p className="mt-1 text-xs text-gray-500">Company is not VAT registered</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Line Items
        </h2>

        <LineItemEditor
          lineItems={lineItems}
          onChange={setLineItems}
          pricingType={effectivePricingType}
          currency={currency}
          projects={companyProjects}
          readOnly={isFieldsDisabled}
        />

        {errors.lineItems && (
          <p className="text-sm text-red-600">{errors.lineItems}</p>
        )}
      </div>

      {/* Payment Records Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Payment Records {payments.length > 0 && `(${payments.length})`}
        </h2>

        <PaymentRecordEditor
          payments={payments}
          onChange={setPayments}
          bankAccounts={companyBankAccounts}
          currency={currency}
          netAmountToPay={netAmountToPay}
          readOnly={isFieldsDisabled}
        />

        {errors.payments && (
          <p className="text-sm text-red-600">{errors.payments}</p>
        )}
      </div>

      {/* Fee/Adjustment Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Fee / Adjustment (Optional)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="none">No Adjustment</option>
              <option value="deduct">Deduct (Bank Fee, etc.)</option>
              <option value="add">Add (Discount, etc.)</option>
            </select>
          </div>

          {adjustmentType !== 'none' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={adjustmentAmount || ''}
                  onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isFieldsDisabled}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account <span className="text-red-500">*</span>
                </label>
                <AccountSelector
                  value={adjustmentAccountCode}
                  onChange={(code) => setAdjustmentAccountCode(code)}
                  accountTypes={['Expense']}
                  placeholder="Select account..."
                  error={!!errors.adjustmentAccountCode}
                  disabled={isFieldsDisabled}
                />
                {errors.adjustmentAccountCode && (
                  <p className="mt-1 text-xs text-red-600">{errors.adjustmentAccountCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark
                </label>
                <input
                  type="text"
                  value={adjustmentRemark}
                  onChange={(e) => setAdjustmentRemark(e.target.value)}
                  placeholder="e.g., Bank transfer fee"
                  disabled={isFieldsDisabled}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </>
          )}
        </div>

        {adjustmentType !== 'none' && adjustmentAmount > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {adjustmentType === 'deduct' ? 'Deducting' : 'Adding'}{' '}
              <span className="font-medium">{formatCurrency(adjustmentAmount, currency)}</span>
              {adjustmentType === 'deduct' ? ' from' : ' to'} total received
            </p>
          </div>
        )}
      </div>

      {/* Receipt Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Receipt Summary
        </h2>

        <div className="flex flex-col items-end space-y-2">
          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Net Amount to Pay:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(netAmountToPay, currency)}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Total Payments:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(receiptTotals.totalPayments, currency)}
            </span>
          </div>

          {adjustmentType !== 'none' && adjustmentAmount > 0 && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">
                {adjustmentType === 'deduct' ? 'Less: Adjustment' : 'Plus: Adjustment'}:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {adjustmentType === 'deduct' ? '-' : '+'}
                {formatCurrency(adjustmentAmount, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between w-full max-w-md border-t pt-2">
            <span className="text-base font-semibold text-gray-900">Total Received:</span>
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(receiptTotals.totalReceived, currency)}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-md">
            <span className="text-base font-semibold text-gray-900">Remaining Amount:</span>
            <span className={`text-base font-bold ${receiptTotals.remainingAmount > 0 ? 'text-amber-600' : receiptTotals.remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(receiptTotals.remainingAmount, currency)}
            </span>
          </div>

          {receiptTotals.remainingAmount !== 0 && (
            <p className={`text-xs ${receiptTotals.remainingAmount > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {receiptTotals.remainingAmount > 0
                ? `${formatCurrency(receiptTotals.remainingAmount, currency)} still outstanding`
                : `${formatCurrency(Math.abs(receiptTotals.remainingAmount), currency)} overpayment`}
            </p>
          )}
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Additional Information
        </h2>

        {/* Notes (Customer-visible) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes / Terms & Conditions
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes that will appear on the receipt..."
            disabled={isFieldsDisabled}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Internal Notes
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes (not visible to customer)..."
            disabled={isFieldsDisabled}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoidModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Void Receipt</h3>
                <p className="text-sm text-gray-500">
                  {receipt?.receiptNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this receipt? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this receipt..."
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
                {isSaving ? 'Voiding...' : 'Void Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <ReceiptPrintView
        receipt={{
          receiptNumber: receiptNumber || receipt?.receiptNumber,
          receiptDate,
          reference,
          lineItems,
          pricingType: effectivePricingType,
          subtotal: documentTotals.subtotal,
          taxAmount: documentTotals.taxAmount,
          whtAmount,
          totalAmount: documentTotals.totalAmount,
          payments,
          adjustmentType,
          adjustmentAmount,
          adjustmentRemark,
          netAmountToPay,
          totalPayments: receiptTotals.totalPayments,
          totalReceived: receiptTotals.totalReceived,
          remainingAmount: receiptTotals.remainingAmount,
          currency,
          notes: notes || undefined,
        }}
        company={selectedCompany}
        client={clientContact}
        clientName={clientName}
        bankAccounts={companyBankAccounts}
        createdBy={receipt?.createdBy}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />
    </div>
  );
}
