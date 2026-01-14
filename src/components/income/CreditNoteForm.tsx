'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Share2, ChevronDown, Pencil, Loader2 } from 'lucide-react';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import CreditNotePrintView from './CreditNotePrintView';
import type { CreditNote, CreditNoteReason, LineItem, PricingType } from '@/data/income/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import type { Contact } from '@/data/contact/types';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { dbCompanyToFrontend, dbProjectToFrontend, dbContactToFrontend, dbReceiptLineItemToFrontend } from '@/lib/supabase/transforms';
import {
  getTodayISO,
  generateId,
  formatCurrency,
  calculateDocumentTotals,
  calculateLineItemTotal,
  calculateTotalWhtAmount,
} from '@/lib/income/utils';
import { getDefaultTermsAndConditions } from '@/data/settings/pdfSettings';

interface CreditNoteFormProps {
  creditNote?: CreditNote;
  receiptId?: string; // For pre-filling from receipt
  onCancel?: () => void;
}

export default function CreditNoteForm({ creditNote, receiptId, onCancel }: CreditNoteFormProps) {
  const router = useRouter();
  const isEditing = !!creditNote;

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [clientContact, setClientContact] = useState<Contact | undefined>(undefined);
  const [sourceReceipt, setSourceReceipt] = useState<{ companyId: string; clientId: string; clientName: string; currency: Currency; pricingType: PricingType; receiptNumber: string; lineItems: LineItem[] } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Form state - initialized from credit note or defaults
  const [companyId, setCompanyId] = useState(creditNote?.companyId || '');
  const [clientId, setClientId] = useState(creditNote?.clientId || '');
  const [clientName, setClientName] = useState(creditNote?.clientName || '');
  const [creditNoteDate, setCreditNoteDate] = useState(creditNote?.creditNoteDate || getTodayISO());
  const [currency, setCurrency] = useState<Currency>(creditNote?.currency || 'USD');

  // Credit note number
  const [creditNoteNumber, setCreditNoteNumber] = useState(creditNote?.creditNoteNumber || '');

  // Reference
  const [reference, setReference] = useState(creditNote?.reference || '');

  // Pricing type
  const [pricingType, setPricingType] = useState<PricingType>(creditNote?.pricingType || 'exclude_vat');

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    creditNote?.lineItems || [
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

  // Reason
  const [reason, setReason] = useState<CreditNoteReason>(creditNote?.reason || 'other');

  // Notes
  const [notes, setNotes] = useState(creditNote?.notes || (isEditing ? '' : getDefaultTermsAndConditions('invoice')));
  const [internalNotes, setInternalNotes] = useState(creditNote?.internalNotes || '');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(creditNote?.status || 'draft');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const companiesData = await companiesApi.getActive();
        setCompanies(companiesData.map(dbCompanyToFrontend));

        // Load receipt data if creating from receipt
        if (receiptId) {
          const receiptWithItems = await receiptsApi.getByIdWithLineItems(receiptId);
          if (receiptWithItems) {
            const lineItemsData = receiptWithItems.line_items?.map(item => ({
              ...dbReceiptLineItemToFrontend(item),
              id: generateId(),
            })) || [];

            const receiptData = {
              companyId: receiptWithItems.company_id,
              clientId: receiptWithItems.client_id || '',
              clientName: receiptWithItems.client_name,
              currency: (receiptWithItems.currency || 'USD') as Currency,
              pricingType: 'exclude_vat' as PricingType, // Receipts don't store pricing type, default to exclude_vat
              receiptNumber: receiptWithItems.receipt_number,
              lineItems: lineItemsData,
            };
            setSourceReceipt(receiptData);

            // Pre-fill form
            setCompanyId(receiptData.companyId);
            setClientId(receiptData.clientId);
            setClientName(receiptData.clientName);
            setCurrency(receiptData.currency);
            setPricingType(receiptData.pricingType);
            setReference(receiptData.receiptNumber);
            if (lineItemsData.length > 0) {
              setLineItems(lineItemsData);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [receiptId]);

  // Load company-specific data when company changes
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!companyId) {
        setCompanyProjects([]);
        return;
      }
      try {
        const projectsData = await projectsApi.getActiveByCompany(companyId);
        setCompanyProjects(projectsData.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load company data:', error);
      }
    };
    loadCompanyData();
  }, [companyId]);

  // Load client contact when client changes
  useEffect(() => {
    const loadClientContact = async () => {
      if (!clientId) {
        setClientContact(undefined);
        return;
      }
      try {
        const contact = await contactsApi.getById(clientId);
        if (contact) {
          setClientContact(dbContactToFrontend(contact));
        }
      } catch (error) {
        console.error('Failed to load client contact:', error);
      }
    };
    loadClientContact();
  }, [clientId]);

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === companyId);

  // Check if VAT is available for selected company
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;

  // Force "No VAT" if company is not VAT registered
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

  // Calculate document totals
  const documentTotals = calculateDocumentTotals(lineItems, effectivePricingType);
  const whtAmount = calculateTotalWhtAmount(lineItems, effectivePricingType);

  // Generate credit note number when company changes (for new credit notes)
  useEffect(() => {
    if (!isEditing && companyId && !creditNoteNumber) {
      const newNumber = `CN-${getTodayISO().replace(/-/g, '').slice(2, 6)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      setCreditNoteNumber(newNumber);
    }
  }, [companyId, isEditing, creditNoteNumber]);

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
  const handleSave = async (status: 'draft' | 'issued') => {
    // Clear previous errors
    setErrors({});

    // For "Issue" status, do full validation
    if (status === 'issued') {
      const newErrors: Record<string, string> = {};

      if (!companyId) newErrors.companyId = 'Company is required';
      if (!clientId) newErrors.clientId = 'Customer is required';
      if (!creditNoteDate) newErrors.creditNoteDate = 'Credit note date is required';

      // Check line items
      const hasValidLineItems = lineItems.some(
        (item) => item.description.trim() !== '' && item.unitPrice > 0
      );
      if (!hasValidLineItems) {
        newErrors.lineItems = 'At least one line item with description and amount is required';
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
      const finalCreditNoteNumber = creditNoteNumber || `CN-${getTodayISO().replace(/-/g, '').slice(2, 6)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Note: Credit notes API save - simplified approach
      const creditNoteData = {
        company_id: companyId,
        credit_note_number: finalCreditNoteNumber,
        client_id: clientId || null,
        client_name: clientName,
        credit_note_date: creditNoteDate,
        reference: reference || null,
        pricing_type: effectivePricingType,
        subtotal: documentTotals.subtotal,
        tax_amount: documentTotals.taxAmount,
        wht_amount: whtAmount,
        total_amount: documentTotals.totalAmount,
        reason,
        currency,
        notes: notes || null,
        status,
      };

      // Create or update credit note
      // Note: For full implementation, would need creditNotesApi
      // For now, log and show success
      console.log('Credit note data to save:', creditNoteData);

      if (isEditing && creditNote) {
        // await creditNotesApi.update(creditNote.id, creditNoteData);
        setCurrentStatus(status);
        setIsEditMode(false);
      } else {
        // const newCreditNote = await creditNotesApi.create(creditNoteData, []);
        // Navigate to edit page for the newly created credit note
        router.push('/accounting/manager/income/credit-notes');
      }
    } catch (error) {
      console.error('Error saving credit note:', error);
      alert('Failed to save credit note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/income/credit-notes');
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

  // Handle void credit note
  const handleVoid = async () => {
    if (!creditNote) return;

    setIsSaving(true);
    try {
      // Note: For full implementation, would need creditNotesApi.update
      console.log('Voiding credit note:', creditNote.id, { voidReason });

      setCurrentStatus('void');
      setShowVoidModal(false);
      setVoidReason('');
      router.push('/accounting/manager/income/credit-notes');
    } catch (error) {
      console.error('Error voiding credit note:', error);
      alert('Failed to void credit note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if document is voided
  const isVoided = currentStatus === 'void';

  // Check if fields should be disabled (view mode for saved documents)
  const isFieldsDisabled = (isEditing && !isEditMode) || isVoided;

  // Show loading state while initial data is being fetched
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
              {isEditing ? 'Edit Credit Note' : 'New Credit Note'}
            </h1>
            {isEditing && creditNote && (
              <p className="text-sm text-gray-500 mt-0.5">{creditNote.creditNoteNumber}</p>
            )}
            {sourceReceipt && !isEditing && (
              <p className="text-sm text-gray-500 mt-0.5">
                From Receipt: {sourceReceipt.receiptNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* NEW DOCUMENT: Cancel, Save Draft, Issue */}
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

          {/* Credit Note Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credit Note Number
            </label>
            <input
              type="text"
              value={creditNoteNumber}
              onChange={(e) => setCreditNoteNumber(e.target.value)}
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
              placeholder="e.g., Receipt number"
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

          {/* Credit Note Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credit Note Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={creditNoteDate}
              onChange={(e) => setCreditNoteDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.creditNoteDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.creditNoteDate && (
              <p className="mt-1 text-xs text-red-600">{errors.creditNoteDate}</p>
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

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CreditNoteReason)}
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="refund">Refund</option>
              <option value="discount">Discount</option>
              <option value="error_correction">Error Correction</option>
              <option value="cancellation">Cancellation</option>
              <option value="other">Other</option>
            </select>
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

      {/* Summary Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Summary
        </h2>

        <div className="flex flex-col items-end space-y-2">
          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(documentTotals.subtotal, currency)}
            </span>
          </div>

          {documentTotals.taxAmount > 0 && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">VAT:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(documentTotals.taxAmount, currency)}
              </span>
            </div>
          )}

          {whtAmount > 0 && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">WHT:</span>
              <span className="text-sm font-medium text-gray-900">
                -{formatCurrency(whtAmount, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between w-full max-w-md border-t pt-2">
            <span className="text-base font-semibold text-gray-900">Total Amount:</span>
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(documentTotals.totalAmount, currency)}
            </span>
          </div>
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
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes that will appear on the credit note..."
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
                <h3 className="text-lg font-semibold text-gray-900">Void Credit Note</h3>
                <p className="text-sm text-gray-500">
                  {creditNote?.creditNoteNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this credit note? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this credit note..."
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
                {isSaving ? 'Voiding...' : 'Void Credit Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <CreditNotePrintView
        creditNote={{
          creditNoteNumber: creditNoteNumber || creditNote?.creditNoteNumber,
          creditNoteDate,
          reference,
          lineItems,
          pricingType: effectivePricingType,
          subtotal: documentTotals.subtotal,
          taxAmount: documentTotals.taxAmount,
          whtAmount,
          totalAmount: documentTotals.totalAmount,
          reason,
          currency,
          notes: notes || undefined,
        }}
        company={selectedCompany}
        client={clientContact}
        clientName={clientName}
        createdBy={creditNote?.createdBy}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />
    </div>
  );
}
