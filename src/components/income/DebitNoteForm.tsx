'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Share2, ChevronDown, Pencil, Loader2 } from 'lucide-react';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import DebitNotePrintView from './DebitNotePrintView';
import type { DebitNote, DebitNoteReason, LineItem, PricingType } from '@/data/income/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import type { Contact } from '@/data/contact/types';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { dbCompanyToFrontend, dbProjectToFrontend, dbContactToFrontend } from '@/lib/supabase/transforms';
import {
  getTodayISO,
  generateId,
  formatCurrency,
  calculateDocumentTotals,
  calculateLineItemTotal,
  calculateTotalWhtAmount,
} from '@/lib/income/utils';
import { getDefaultTermsAndConditions } from '@/data/settings/pdfSettings';

interface DebitNoteFormProps {
  debitNote?: DebitNote;
  receiptId?: string; // For pre-filling from receipt
  onCancel?: () => void;
}

export default function DebitNoteForm({ debitNote, receiptId, onCancel }: DebitNoteFormProps) {
  const router = useRouter();
  const isEditing = !!debitNote;

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [clientContact, setClientContact] = useState<Contact | undefined>(undefined);
  const [sourceReceipt, setSourceReceipt] = useState<{ companyId: string; clientId: string; clientName: string; currency: Currency; pricingType: PricingType; receiptNumber: string } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Form state - initialized from debit note or defaults
  const [companyId, setCompanyId] = useState(debitNote?.companyId || '');
  const [clientId, setClientId] = useState(debitNote?.clientId || '');
  const [clientName, setClientName] = useState(debitNote?.clientName || '');
  const [debitNoteDate, setDebitNoteDate] = useState(debitNote?.debitNoteDate || getTodayISO());
  const [currency, setCurrency] = useState<Currency>(debitNote?.currency || 'USD');

  // Debit note number
  const [debitNoteNumber, setDebitNoteNumber] = useState(debitNote?.debitNoteNumber || '');

  // Reference
  const [reference, setReference] = useState(debitNote?.reference || '');

  // Pricing type
  const [pricingType, setPricingType] = useState<PricingType>(debitNote?.pricingType || 'exclude_vat');

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    debitNote?.lineItems || [
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
  const [reason, setReason] = useState<DebitNoteReason>(debitNote?.reason || 'other');

  // Notes
  const [notes, setNotes] = useState(debitNote?.notes || (isEditing ? '' : getDefaultTermsAndConditions('invoice')));
  const [internalNotes, setInternalNotes] = useState(debitNote?.internalNotes || '');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(debitNote?.status || 'draft');
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
          const receiptData = await receiptsApi.getById(receiptId);
          if (receiptData) {
            const receipt = {
              companyId: receiptData.company_id,
              clientId: receiptData.client_id || '',
              clientName: receiptData.client_name,
              currency: (receiptData.currency || 'USD') as Currency,
              pricingType: 'exclude_vat' as PricingType, // Receipts don't store pricing type
              receiptNumber: receiptData.receipt_number,
            };
            setSourceReceipt(receipt);

            // Pre-fill form
            setCompanyId(receipt.companyId);
            setClientId(receipt.clientId);
            setClientName(receipt.clientName);
            setCurrency(receipt.currency);
            setPricingType(receipt.pricingType);
            setReference(receipt.receiptNumber);
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

  // Generate debit note number when company changes (for new debit notes)
  useEffect(() => {
    if (!isEditing && companyId && !debitNoteNumber) {
      const newNumber = `DN-${getTodayISO().replace(/-/g, '').slice(2, 6)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      setDebitNoteNumber(newNumber);
    }
  }, [companyId, isEditing, debitNoteNumber]);

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
      if (!debitNoteDate) newErrors.debitNoteDate = 'Debit note date is required';

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
      const finalDebitNoteNumber = debitNoteNumber || `DN-${getTodayISO().replace(/-/g, '').slice(2, 6)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Note: Debit notes API save - simplified approach
      const debitNoteData = {
        company_id: companyId,
        debit_note_number: finalDebitNoteNumber,
        client_id: clientId || null,
        client_name: clientName,
        debit_note_date: debitNoteDate,
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

      // Note: For full implementation, would need debitNotesApi
      console.log('Debit note data to save:', debitNoteData);

      if (isEditing && debitNote) {
        // await debitNotesApi.update(debitNote.id, debitNoteData);
        setCurrentStatus(status);
        setIsEditMode(false);
      } else {
        // const newDebitNote = await debitNotesApi.create(debitNoteData, []);
        router.push('/accounting/manager/income/debit-notes');
      }
    } catch (error) {
      console.error('Error saving debit note:', error);
      alert('Failed to save debit note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/income/debit-notes');
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

  // Handle void debit note
  const handleVoid = async () => {
    if (!debitNote) return;

    setIsSaving(true);
    try {
      // Note: For full implementation, would need debitNotesApi.update
      console.log('Voiding debit note:', debitNote.id, { voidReason });

      setCurrentStatus('void');
      setShowVoidModal(false);
      setVoidReason('');
      router.push('/accounting/manager/income/debit-notes');
    } catch (error) {
      console.error('Error voiding debit note:', error);
      alert('Failed to void debit note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if document is voided
  const isVoided = currentStatus === 'void';
  const isFieldsDisabled = (isEditing && !isEditMode) || isVoided;

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
              {isEditing ? 'Edit Debit Note' : 'New Debit Note'}
            </h1>
            {isEditing && debitNote && (
              <p className="text-sm text-gray-500 mt-0.5">{debitNote.debitNoteNumber}</p>
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

          {/* SAVED DOCUMENT: Print, Share, Edit/Save, Options dropdown */}
          {isEditing && (
            <>
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

          {/* Debit Note Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Debit Note Number
            </label>
            <input
              type="text"
              value={debitNoteNumber}
              onChange={(e) => setDebitNoteNumber(e.target.value)}
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

          {/* Debit Note Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Debit Note Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={debitNoteDate}
              onChange={(e) => setDebitNoteDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.debitNoteDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.debitNoteDate && (
              <p className="mt-1 text-xs text-red-600">{errors.debitNoteDate}</p>
            )}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <CurrencySelect
              value={currency}
              onChange={(val) => setCurrency(val as Currency)}
              disabled={isFieldsDisabled}
            />
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
              onChange={(e) => setReason(e.target.value as DebitNoteReason)}
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="late_fee">Late Fee</option>
              <option value="additional_services">Additional Services</option>
              <option value="price_adjustment">Price Adjustment</option>
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
            placeholder="Notes that will appear on the debit note..."
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
                <h3 className="text-lg font-semibold text-gray-900">Void Debit Note</h3>
                <p className="text-sm text-gray-500">
                  {debitNote?.debitNoteNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this debit note? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this debit note..."
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
                {isSaving ? 'Voiding...' : 'Void Debit Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <DebitNotePrintView
        debitNote={{
          debitNoteNumber: debitNoteNumber || debitNote?.debitNoteNumber,
          debitNoteDate,
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
        createdBy={debitNote?.createdBy}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />
    </div>
  );
}
