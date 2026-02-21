'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Upload, FileText, Trash2, Loader2, Camera, Plus, Minus } from 'lucide-react';
import type { Attachment } from '@/data/petty-cash/types';
import type { Project } from '@/data/project/types';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';
import { getTodayISO, generateId } from '@/lib/petty-cash/utils';
import { inventoryPurchasesApi } from '@/lib/supabase/api/inventoryPurchases';
import { pettyCashApi } from '@/lib/supabase/api/pettyCash';
import { VendorSelector } from '../expenses/VendorSelector';

interface LineItem {
  id: string;
  projectId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface StockPurchaseFormProps {
  walletId: string;
  companyId: string;
  currency: string;
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'provisions', label: 'Provisions & Consumables' },
  { value: 'boat_parts', label: 'Boat Parts & Equipment' },
  { value: 'office_supplies', label: 'Office & General Supplies' },
];

function createEmptyLineItem(): LineItem {
  return {
    id: generateId(),
    projectId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
  };
}

export default function StockPurchaseForm({
  walletId,
  companyId,
  currency,
  userId,
  onSave,
  onCancel,
}: StockPurchaseFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Form state
  const [purchaseDate, setPurchaseDate] = useState(getTodayISO());
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('general');
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.getActive();
        setProjects(data.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Currency symbol
  const currencySymbol = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : '\u0E3F';

  // Calculate totals
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

  // Line item handlers
  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, [field]: value } : li))
    );
  }, []);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((li) => li.id !== id)));
  }, []);

  // File upload (same pattern as ExpenseForm)
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          setErrors((prev) => ({ ...prev, attachments: 'Only JPEG, PNG, GIF, and PDF files are allowed' }));
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setErrors((prev) => ({ ...prev, attachments: 'File size must be less than 10MB' }));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const attachment: Attachment = {
            id: `att-${generateId()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: e.target?.result as string,
            uploadedAt: new Date().toISOString(),
          };
          setAttachments((prev) => [...prev, attachment]);
          setErrors((prev) => {
            const { attachments: _, ...rest } = prev;
            return rest;
          });
        };
        reader.readAsDataURL(file);
      });
      event.target.value = '';
    },
    []
  );

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  // Validate
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!purchaseDate) errs.purchaseDate = 'Purchase date is required';
    if (!vendorId) errs.vendorName = 'Please select a vendor';

    // Validate line items
    const hasEmptyProject = lineItems.some((li) => !li.projectId);
    const hasEmptyDescription = lineItems.some((li) => !li.description.trim());
    const hasZeroPrice = lineItems.some((li) => li.unitPrice <= 0);

    if (hasEmptyProject) errs.lineItems = 'All items must have a project selected';
    else if (hasEmptyDescription) errs.lineItems = 'All items must have a description';
    else if (hasZeroPrice) errs.lineItems = 'All items must have a unit price greater than 0';

    if (subtotal <= 0) errs.total = 'Total must be greater than 0';

    return errs;
  }, [purchaseDate, vendorId, lineItems, subtotal]);

  // Save
  const handleSave = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      isSubmittingRef.current = false;
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const purchaseData = {
        company_id: companyId,
        vendor_id: vendorId || null,
        vendor_name: vendorName.trim(),
        supplier_invoice_number: null,
        supplier_invoice_date: null,
        purchase_date: purchaseDate,
        category,
        expected_delivery_date: null,
        actual_delivery_date: null,
        pricing_type: 'no_vat' as const,
        currency,
        fx_rate: null,
        fx_rate_source: null,
        fx_rate_date: null,
        subtotal,
        vat_amount: 0,
        total_amount: subtotal,
        net_payable: subtotal,
        thb_subtotal: null,
        thb_vat_amount: null,
        thb_total_amount: null,
        thb_net_payable: null,
        payment_status: 'unpaid',
        amount_paid: 0,
        amount_outstanding: subtotal,
        status: 'draft',
        received_date: null,
        received_by: null,
        voided_date: null,
        void_reason: null,
        receipt_status: 'pending',
        receipt_received_date: null,
        receipt_received_by: null,
        notes: notes.trim() || null,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : '[]',
        created_by: userId,
      };

      const lineItemsData = lineItems.map((li, idx) => ({
        project_id: li.projectId,
        description: li.description.trim(),
        sku: null,
        unit: null,
        quantity: li.quantity,
        unit_price: li.unitPrice,
        tax_rate: 0,
        amount: li.quantity * li.unitPrice,
        pre_vat_amount: li.quantity * li.unitPrice,
        account_code: '1200',
        expense_account_code: null,
        attachments: '[]',
        line_order: idx + 1,
      }));

      const paymentInfo = {
        paymentDate: purchaseDate,
        amount: subtotal,
        paymentType: 'petty_cash' as const,
        pettyWalletId: walletId,
      };

      const result = await inventoryPurchasesApi.recordWithPayment(
        purchaseData as Parameters<typeof inventoryPurchasesApi.recordWithPayment>[0],
        lineItemsData as Parameters<typeof inventoryPurchasesApi.recordWithPayment>[1],
        paymentInfo,
        userId
      );

      // Create reimbursement record so wallet can be replenished
      // NOTE: No updateWallet call — the RPC calculates balance from submitted expenses automatically
      if (result.pettyCashExpenseId) {
        await pettyCashApi.createReimbursementWithNumber({
          expense_id: result.pettyCashExpenseId,
          wallet_id: walletId,
          company_id: companyId,
          amount: subtotal,
          adjustment_amount: null,
          adjustment_reason: null,
          final_amount: subtotal,
          status: 'pending',
          bank_account_id: null,
          payment_date: null,
          payment_reference: null,
          approved_by: null,
          rejected_by: null,
          rejection_reason: null,
          bank_feed_line_id: null,
          created_by: userId,
        });
      }

      onSave();
    } catch (error) {
      console.error('Failed to create stock purchase:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrors({ submit: `Failed to create stock purchase: ${msg}` });
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  }, [
    validate, companyId, vendorId, vendorName, purchaseDate, category, currency,
    subtotal, notes, attachments, lineItems, walletId, userId, onSave,
  ]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New Stock Purchase</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Record items bought with petty cash
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Error Banner */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {/* Row: Date + Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                    errors.purchaseDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.purchaseDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.purchaseDate}</p>
                )}
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor / Shop <span className="text-red-500">*</span>
                </label>
                <VendorSelector
                  value={vendorId}
                  onChange={(id, name) => {
                    setVendorId(id);
                    setVendorName(name);
                  }}
                />
                {errors.vendorName && (
                  <p className="mt-1 text-sm text-red-600">{errors.vendorName}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items Purchased <span className="text-red-500">*</span>
              </label>
              {errors.lineItems && (
                <p className="mb-2 text-sm text-red-600">{errors.lineItems}</p>
              )}

              <div className="space-y-3">
                {lineItems.map((li, idx) => (
                  <div key={li.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(li.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Project */}
                    <select
                      value={li.projectId}
                      onChange={(e) => updateLineItem(li.id, 'projectId', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </select>

                    {/* Description */}
                    <input
                      type="text"
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                      placeholder="What did you buy?"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    />

                    {/* Qty + Price + Amount */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          value={li.quantity}
                          onChange={(e) =>
                            updateLineItem(li.id, 'quantity', Math.max(1, parseFloat(e.target.value) || 1))
                          }
                          min="1"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            value={li.unitPrice || ''}
                            onChange={(e) =>
                              updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Amount</label>
                        <div className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg text-right font-medium text-gray-700">
                          {currencySymbol}{(li.quantity * li.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLineItem}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#5A7A8F] hover:text-[#4a6a7f]"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {currencySymbol}{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {errors.total && (
              <p className="text-sm text-red-600">{errors.total}</p>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Photo <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 hover:border-[#5A7A8F] rounded-lg p-4 text-center transition-colors">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  multiple
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  className="hidden"
                  id="stock-file-upload"
                />
                <label htmlFor="stock-file-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Camera className="h-6 w-6 text-gray-400" />
                    <Upload className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-600">Take photo or upload receipt</span>
                  <span className="text-xs text-gray-400 mt-0.5">JPEG, PNG, GIF, PDF up to 10MB</span>
                </label>
              </div>
              {errors.attachments && (
                <p className="mt-1 text-sm text-red-600">{errors.attachments}</p>
              )}

              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {att.type.startsWith('image/') ? (
                          <img src={att.url} alt={att.name} className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <FileText className="h-10 w-10 text-gray-400 p-2" />
                        )}
                        <div>
                          <span className="text-sm text-gray-700 block truncate max-w-[180px]">{att.name}</span>
                          <span className="text-xs text-gray-400">({(att.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                This will be recorded as an inventory purchase paid from your petty cash wallet.
                The accountant can review or adjust it later.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoadingProjects}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
