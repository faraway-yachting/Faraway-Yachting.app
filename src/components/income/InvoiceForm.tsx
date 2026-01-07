'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Building2, AlertCircle, Share2, ChevronDown, Receipt, Pencil } from 'lucide-react';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import InvoicePrintView from './InvoicePrintView';
import type { Invoice, LineItem, PricingType } from '@/data/income/types';
import type { Currency } from '@/data/company/types';
import { getActiveCompanies } from '@/data/company/companies';
import { createInvoice, updateInvoice } from '@/data/income/invoices';
import { getQuotationById } from '@/data/income/quotations';
import { getActiveBankAccountsByCompany } from '@/data/banking/bankAccounts';
import { getContactById } from '@/data/contact/contacts';
import { getDefaultTermsAndConditions, getDefaultValidityDays } from '@/data/settings/pdfSettings';
import { getActiveProjectsByCompany } from '@/data/project/projects';
import { calculateDocumentTotals, calculateLineItemTotal, calculateTotalWhtAmount, getTodayISO, addDays, generateId } from '@/lib/income/utils';

interface InvoiceFormProps {
  invoice?: Invoice;
  quotationId?: string; // For pre-filling from quotation
  onCancel?: () => void;
}

export default function InvoiceForm({ invoice, quotationId, onCancel }: InvoiceFormProps) {
  const router = useRouter();
  const isEditing = !!invoice;

  // Get available companies
  const companies = getActiveCompanies();

  // Get quotation data if creating from quotation
  const sourceQuotation = quotationId ? getQuotationById(quotationId) : undefined;

  // Form state - initialized from invoice, quotation, or defaults
  const [companyId, setCompanyId] = useState(
    invoice?.companyId || sourceQuotation?.companyId || ''
  );
  const [clientId, setClientId] = useState(
    invoice?.clientId || sourceQuotation?.clientId || ''
  );
  const [clientName, setClientName] = useState(
    invoice?.clientName || sourceQuotation?.clientName || ''
  );
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoiceDate || getTodayISO()
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate || addDays(getTodayISO(), getDefaultValidityDays('invoice'))
  );
  const [currency, setCurrency] = useState<Currency>(
    invoice?.currency || sourceQuotation?.currency || 'USD'
  );
  const [pricingType, setPricingType] = useState<PricingType>(
    invoice?.pricingType || sourceQuotation?.pricingType || 'exclude_vat'
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || sourceQuotation?.lineItems?.map(item => ({ ...item, id: generateId() })) || [
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
  const [notes, setNotes] = useState(
    invoice?.notes || (isEditing ? '' : getDefaultTermsAndConditions('invoice'))
  );
  const [internalNotes, setInternalNotes] = useState(invoice?.internalNotes || '');
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || '');
  const [reference, setReference] = useState(
    invoice?.reference || sourceQuotation?.quotationNumber || ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(invoice?.status || 'draft');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === companyId);

  // Get bank account matching selected company and currency
  const companyBankAccounts = companyId ? getActiveBankAccountsByCompany(companyId) : [];
  const paymentBankAccount = companyBankAccounts.find((ba) => ba.currency === currency);

  // Get active projects for selected company
  const companyProjects = companyId ? getActiveProjectsByCompany(companyId) : [];

  // Get client contact for print view
  const clientContact = clientId ? getContactById(clientId) : undefined;

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

  // Calculate totals
  const totals = calculateDocumentTotals(lineItems, effectivePricingType);
  const whtAmount = calculateTotalWhtAmount(lineItems, effectivePricingType);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyId) newErrors.companyId = 'Company is required';
    if (!clientId) newErrors.clientId = 'Customer is required';
    if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required';

    // Date validation
    if (dueDate && invoiceDate && dueDate < invoiceDate) {
      newErrors.dueDate = 'Due date must be on or after invoice date';
    }

    // Line items validation
    lineItems.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        newErrors[`lineItem_${index}_description`] = 'Description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`lineItem_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`lineItem_${index}_unitPrice`] = 'Unit price cannot be negative';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async (status: 'draft' | 'issued') => {
    // Clear previous errors
    setErrors({});

    // Filter out completely empty line items (no description and no price)
    const nonEmptyLineItems = lineItems.filter(
      item => item.description.trim() !== '' || item.unitPrice > 0
    );

    // For "Issue" (issued status), do full validation
    if (status === 'issued') {
      const newErrors: Record<string, string> = {};

      if (!companyId) newErrors.companyId = 'Company is required';
      if (!clientId) newErrors.clientId = 'Customer is required';
      if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';

      // Check if there are valid line items
      if (nonEmptyLineItems.length === 0) {
        newErrors.lineItems = 'At least one line item with description or price is required';
      }

      // Date validation
      if (dueDate && invoiceDate && dueDate < invoiceDate) {
        newErrors.dueDate = 'Due date must be on or after invoice date';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Scroll to top to show errors
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
      const invoiceData: Partial<Invoice> = {
        companyId,
        clientId,
        clientName,
        quotationId: sourceQuotation?.id || invoice?.quotationId,
        invoiceNumber: invoiceNumber || undefined, // Will be auto-generated if empty
        invoiceDate,
        dueDate,
        currency,
        pricingType: effectivePricingType,
        lineItems: nonEmptyLineItems.length > 0 ? nonEmptyLineItems : lineItems,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        reference: reference || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        status,
        issuedDate: status === 'issued' ? getTodayISO() : undefined,
      };

      // Create or update invoice
      if (isEditing && invoice) {
        const updated = updateInvoice(invoice.id, invoiceData);
        console.log('Updated invoice:', updated);
        if (updated) {
          setCurrentStatus(status);
          setIsEditMode(false); // Switch to view mode after save
        }
      } else {
        const newInvoice = createInvoice(invoiceData);
        console.log('Created invoice:', newInvoice);
        // Navigate to edit page for the newly created invoice
        if (newInvoice) {
          router.push(`/accounting/manager/income/invoices/${newInvoice.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/income/invoices');
    }
  };

  // Handle print/export PDF
  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  // Handle share PDF (placeholder for API integration)
  const handleShare = () => {
    // TODO: Connect with share API
    // This will generate PDF and share via email or other channels
    alert('Share functionality coming soon! This will allow you to share the PDF via email or other channels.');
  };

  // Handle void invoice
  const handleVoid = async () => {
    if (!invoice) return;

    setIsSaving(true);
    try {
      const updated = updateInvoice(invoice.id, {
        status: 'void',
        voidedDate: getTodayISO(),
        voidReason: voidReason || undefined,
        internalNotes: voidReason ? `${internalNotes}\n\nVoid Reason: ${voidReason}` : internalNotes,
      });

      if (updated) {
        setCurrentStatus('void');
        setShowVoidModal(false);
        setVoidReason('');
        // Optionally navigate back to list
        router.push('/accounting/manager/income/invoices');
      }
    } catch (error) {
      console.error('Error voiding invoice:', error);
      alert('Failed to void invoice. Please try again.');
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
              {isEditing ? 'Edit Invoice' : 'New Invoice'}
            </h1>
            {isEditing && invoice && (
              <p className="text-sm text-gray-500 mt-0.5">{invoice.invoiceNumber}</p>
            )}
            {sourceQuotation && !isEditing && (
              <p className="text-sm text-gray-500 mt-0.5">
                From Quotation: {sourceQuotation.quotationNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* NEW DOCUMENT: Cancel, Save Draft, Save */}
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
                onClick={() => handleSave('issued')}
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
                    onClick={() => handleSave(currentStatus === 'draft' ? 'draft' : 'issued')}
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

              {/* Voided badge - show instead of Options when voided */}
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
                      {/* Create Receipt */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          router.push(`/accounting/manager/income/receipts/new?from=${invoice?.id}`);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Receipt className="h-4 w-4" />
                        <span>Create Receipt</span>
                      </button>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to auto-generate</p>
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

          {/* Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.invoiceDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.invoiceDate && (
              <p className="mt-1 text-xs text-red-600">{errors.invoiceDate}</p>
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
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.dueDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
            )}
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
              placeholder="e.g., PO-12345"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Pricing Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pricing Type
          </label>
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 ${isFieldsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                value="exclude_vat"
                checked={effectivePricingType === 'exclude_vat'}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                disabled={!isVatAvailable || isFieldsDisabled}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${!isVatAvailable || isFieldsDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                Exclude VAT (prices net, VAT added)
              </span>
            </label>

            <label className={`flex items-center gap-2 ${isFieldsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                value="include_vat"
                checked={effectivePricingType === 'include_vat'}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                disabled={!isVatAvailable || isFieldsDisabled}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${!isVatAvailable || isFieldsDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                Include VAT (prices gross, VAT extracted)
              </span>
            </label>

            <label className={`flex items-center gap-2 ${isFieldsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                value="no_vat"
                checked={effectivePricingType === 'no_vat'}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                disabled={isFieldsDisabled}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${isFieldsDisabled ? 'text-gray-400' : 'text-gray-700'}`}>No VAT</span>
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

      {/* Payment Details Section */}
      {companyId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
            Payment Details
          </h2>

          {paymentBankAccount ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Bank Name</p>
                  <p className="text-sm text-gray-900">{paymentBankAccount.bankInformation.bankName}</p>
                </div>
              </div>

              {paymentBankAccount.bankInformation.bankBranch && (
                <div className="flex items-start gap-3">
                  <div className="w-5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Branch</p>
                    <p className="text-sm text-gray-900">{paymentBankAccount.bankInformation.bankBranch}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Name</p>
                  <p className="text-sm text-gray-900">{paymentBankAccount.accountName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Number</p>
                  <p className="text-sm text-gray-900 font-mono">{paymentBankAccount.accountNumber}</p>
                </div>
              </div>

              {paymentBankAccount.bankInformation.swiftBic && (
                <div className="flex items-start gap-3">
                  <div className="w-5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">SWIFT/BIC</p>
                    <p className="text-sm text-gray-900 font-mono">{paymentBankAccount.bankInformation.swiftBic}</p>
                  </div>
                </div>
              )}

              {paymentBankAccount.iban && (
                <div className="flex items-start gap-3">
                  <div className="w-5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">IBAN</p>
                    <p className="text-sm text-gray-900 font-mono">{paymentBankAccount.iban}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  No bank account found for {currency} currency
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Please add a {currency} account in Settings → Bank Accounts for the selected company.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Additional Information
        </h2>

        {/* Notes (Customer-visible) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Terms & Conditions
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Enter terms and conditions that will appear on the invoice..."
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
                <h3 className="text-lg font-semibold text-gray-900">Void Invoice</h3>
                <p className="text-sm text-gray-500">
                  {invoice?.invoiceNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this invoice? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this invoice..."
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
                {isSaving ? 'Voiding...' : 'Void Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <InvoicePrintView
        invoice={{
          invoiceNumber: invoiceNumber || invoice?.invoiceNumber,
          invoiceDate,
          dueDate,
          lineItems,
          pricingType: effectivePricingType,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          whtAmount,
          currency,
          notes: notes || undefined,
        }}
        company={selectedCompany}
        client={clientContact}
        clientName={clientName}
        bankAccount={paymentBankAccount}
        createdBy={invoice?.createdBy}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />
    </div>
  );
}
