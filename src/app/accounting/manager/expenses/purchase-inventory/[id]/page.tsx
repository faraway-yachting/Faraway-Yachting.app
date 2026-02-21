'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Loader2,
  Package,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Pencil,
  Ban,
} from 'lucide-react';
import { inventoryPurchasesApi } from '@/lib/supabase/api/inventoryPurchases';
import type {
  InventoryPurchaseWithDetails,
  InventoryPurchaseLineItemRow,
  InventoryConsumptionRecordRow,
} from '@/lib/supabase/api/inventoryPurchases';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbCompanyToFrontend, dbProjectToFrontend } from '@/lib/supabase/transforms';
import { RelatedJournalEntries } from '@/components/accounting/RelatedJournalEntries';
import AccountCodeSelector from '@/components/accounting/AccountCodeSelector';
import { createClient } from '@/lib/supabase/client';
import type { Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import Link from 'next/link';

const basePath = '/accounting/manager/expenses/purchase-inventory';

export default function InventoryPurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [purchase, setPurchase] = useState<InventoryPurchaseWithDetails | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Consume dialog
  const [consumeLineItem, setConsumeLineItem] = useState<InventoryPurchaseLineItemRow | null>(null);
  const [consumeQty, setConsumeQty] = useState(0);
  const [consumeProjectId, setConsumeProjectId] = useState('');
  const [consumeAccountCode, setConsumeAccountCode] = useState('');
  const [consumeNotes, setConsumeNotes] = useState('');
  const [isConsuming, setIsConsuming] = useState(false);
  const [consumeError, setConsumeError] = useState('');

  // Void dialog
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!params.id) return;

      try {
        const purchaseId = Array.isArray(params.id) ? params.id[0] : params.id;
        const [purchaseData, companiesData, projectsData] = await Promise.all([
          inventoryPurchasesApi.getByIdWithDetails(purchaseId),
          companiesApi.getActive(),
          projectsApi.getAll(),
        ]);

        if (!purchaseData) {
          setNotFound(true);
        } else {
          setPurchase(purchaseData);
        }
        setCompanies(companiesData.map(dbCompanyToFrontend));
        setProjects(projectsData.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load purchase:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params.id]);

  const handleOpenConsume = (lineItem: InventoryPurchaseLineItemRow) => {
    const remaining = lineItem.quantity - lineItem.quantity_consumed;
    setConsumeLineItem(lineItem);
    setConsumeQty(remaining);
    setConsumeProjectId(lineItem.project_id);
    setConsumeAccountCode(lineItem.expense_account_code || '');
    setConsumeNotes('');
    setConsumeError('');
  };

  const handleConsume = async () => {
    if (!consumeLineItem || !purchase) return;

    const remaining = consumeLineItem.quantity - consumeLineItem.quantity_consumed;
    if (consumeQty <= 0 || consumeQty > remaining) {
      setConsumeError(`Quantity must be between 0.01 and ${remaining}`);
      return;
    }
    if (!consumeProjectId) {
      setConsumeError('Project is required');
      return;
    }
    if (!consumeAccountCode) {
      setConsumeError('Expense account is required');
      return;
    }

    setIsConsuming(true);
    setConsumeError('');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await inventoryPurchasesApi.consumeItems(
        purchase.id,
        [
          {
            lineItemId: consumeLineItem.id,
            quantity: consumeQty,
            projectId: consumeProjectId,
            expenseAccountCode: consumeAccountCode,
            notes: consumeNotes || undefined,
          },
        ],
        new Date().toISOString().split('T')[0],
        user?.id || ''
      );

      // Reload
      const updated = await inventoryPurchasesApi.getByIdWithDetails(purchase.id);
      if (updated) setPurchase(updated);
      setConsumeLineItem(null);
    } catch (error: any) {
      console.error('Failed to consume:', error);
      setConsumeError(error?.message || 'Failed to consume items');
    } finally {
      setIsConsuming(false);
    }
  };

  const handleVoid = async () => {
    if (!purchase || !voidReason.trim()) return;
    setIsVoiding(true);
    try {
      await inventoryPurchasesApi.void(purchase.id, voidReason.trim());
      router.push(basePath);
    } catch (error: any) {
      console.error('Failed to void:', error);
      alert(error?.message || 'Failed to void purchase');
    } finally {
      setIsVoiding(false);
    }
  };

  const getCompanyName = (companyId: string) =>
    companies.find((c) => c.id === companyId)?.name || companyId;

  const getProjectName = (projectId: string) => {
    const p = projects.find((pr) => pr.id === projectId);
    return p ? `${p.code} - ${p.name}` : projectId;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency?: string) => {
    const prefix = currency ? `${currency} ` : '';
    return `${prefix}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
      </div>
    );
  }

  if (notFound || !purchase) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Not Found</h3>
        <p className="text-sm text-gray-500 mb-4">
          The inventory purchase you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href={basePath}
          className="text-sm font-medium text-[#5A7A8F] hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const isVoided = purchase.status === 'void';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href={basePath}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-[#5A7A8F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {purchase.purchase_number}
            </h1>
            <p className="text-sm text-gray-500">
              {getCompanyName(purchase.company_id)}
              {purchase.vendor_name && ` — ${purchase.vendor_name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVoided && (
            <span className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
              Voided
            </span>
          )}
          {purchase.status === 'received' && (
            <span className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg">
              Received
            </span>
          )}
          {purchase.status === 'draft' && (
            <span className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
              Draft
            </span>
          )}
          {!isVoided && (
            <>
              <Link
                href={`${basePath}/${purchase.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded-lg hover:bg-[#5A7A8F]/5 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setShowVoidModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Ban className="h-3.5 w-3.5" />
                Void
              </button>
            </>
          )}
        </div>
      </div>

      {/* Purchase Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
          Purchase Details
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Purchase Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(purchase.purchase_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Category</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">
              {purchase.category === 'provisions' ? 'Provisions & Consumables' :
               purchase.category === 'boat_parts' ? 'Boat Parts & Equipment' :
               purchase.category === 'office_supplies' ? 'Office & General Supplies' :
               purchase.category === 'general' || !purchase.category ? 'General' :
               purchase.category.replace(/_/g, ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Currency</dt>
            <dd className="mt-1 text-sm text-gray-900">{purchase.currency}</dd>
          </div>
          {purchase.fx_rate && purchase.currency !== 'THB' && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">FX Rate</dt>
              <dd className="mt-1 text-sm text-gray-900">
                1 {purchase.currency} = {purchase.fx_rate} THB
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Payment</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                  purchase.payment_status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {purchase.payment_status.replace('_', ' ')}
              </span>
            </dd>
          </div>
          {purchase.supplier_invoice_number && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Supplier Invoice</dt>
              <dd className="mt-1 text-sm text-gray-900">{purchase.supplier_invoice_number}</dd>
            </div>
          )}
          {purchase.expected_delivery_date && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Expected Delivery</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(purchase.expected_delivery_date)}
              </dd>
            </div>
          )}
          {purchase.actual_delivery_date && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Actual Delivery</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(purchase.actual_delivery_date)}
              </dd>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex justify-between w-full max-w-xs">
              <span className="text-sm text-gray-500">Subtotal:</span>
              <span className="text-sm font-medium">{formatAmount(purchase.subtotal, purchase.currency)}</span>
            </div>
            {purchase.vat_amount > 0 && (
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-sm text-gray-500">VAT:</span>
                <span className="text-sm font-medium">{formatAmount(purchase.vat_amount, purchase.currency)}</span>
              </div>
            )}
            <div className="flex justify-between w-full max-w-xs">
              <span className="text-sm text-gray-500">Total:</span>
              <span className="text-sm font-medium">{formatAmount(purchase.total_amount, purchase.currency)}</span>
            </div>
            <div className="flex justify-between w-full max-w-xs border-t pt-1">
              <span className="text-base font-semibold">Net Payable:</span>
              <span className="text-base font-bold text-[#5A7A8F]">
                {formatAmount(purchase.net_payable, purchase.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {purchase.payments && purchase.payments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Payments
          </h2>
          <div className="space-y-3">
            {purchase.payments.map((pmt) => (
              <div
                key={pmt.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {pmt.payment_type.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {formatDate(pmt.payment_date)}
                  </span>
                  {pmt.reference && (
                    <span className="text-sm text-gray-400 ml-2">
                      Ref: {pmt.reference}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatAmount(pmt.amount, purchase.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line Items with Consumption */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
          Line Items
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>


                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Consumed
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Remaining
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Unit Price
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                {!isVoided && purchase.status === 'received' && (
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchase.line_items.map((li) => {
                const remaining = li.quantity - li.quantity_consumed;
                const isFullyConsumed = remaining <= 0;

                return (
                  <tr key={li.id} className={isFullyConsumed ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-3 text-sm text-gray-900">{li.description}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {getProjectName(li.project_id)}
                    </td>


                    <td className="px-3 py-3 text-sm text-gray-900 text-right">
                      {li.quantity}
                    </td>
                    <td className="px-3 py-3 text-sm text-right">
                      <span className={li.quantity_consumed > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                        {li.quantity_consumed}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-right">
                      <span className={isFullyConsumed ? 'text-gray-400' : 'text-green-600 font-medium'}>
                        {remaining}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-right">
                      {li.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium">
                      {li.pre_vat_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {!isVoided && purchase.status === 'received' && (
                      <td className="px-3 py-3 text-center">
                        {isFullyConsumed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <CheckCircle className="h-3.5 w-3.5" /> Done
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenConsume(li)}
                            className="px-3 py-1 text-xs font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded hover:bg-[#5A7A8F]/5 transition-colors"
                          >
                            Consume
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Consumption History */}
        {purchase.line_items.some(
          (li) => li.consumption_records && li.consumption_records.length > 0
        ) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Consumption History
            </h3>
            <div className="space-y-2">
              {purchase.line_items
                .flatMap((li) =>
                  (li.consumption_records || []).map((cr) => ({
                    ...cr,
                    itemDescription: li.description,
                    unit: li.unit,
                    unitPrice: li.unit_price,
                  }))
                )
                .sort((a, b) => b.consumed_date.localeCompare(a.consumed_date))
                .map((cr) => (
                  <div
                    key={cr.id}
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{cr.itemDescription}</span>
                      <span className="text-gray-500 ml-2">
                        {cr.quantity} consumed
                      </span>
                      <span className="text-gray-400 ml-2">
                        {formatDate(cr.consumed_date)}
                      </span>
                      <span className="text-gray-500 ml-2">
                        → {getProjectName(cr.project_id)}
                      </span>
                      {cr.notes && (
                        <span className="text-gray-400 ml-2 italic">({cr.notes})</span>
                      )}
                    </div>
                    <span className="font-medium text-orange-700">
                      {formatAmount(cr.quantity * cr.unitPrice, purchase.currency)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Journal Entries */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
          Journal Entries
        </h2>
        <RelatedJournalEntries
          documentType="inventory_purchase"
          documentId={purchase.id}
        />
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Notes
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{purchase.notes}</p>
        </div>
      )}

      {/* Consume Dialog */}
      {consumeLineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConsumeLineItem(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Consume Inventory
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {consumeLineItem.description} — Remaining:{' '}
              {consumeLineItem.quantity - consumeLineItem.quantity_consumed} {consumeLineItem.unit || 'pcs'}
            </p>

            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Consume
                </label>
                <input
                  type="number"
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(parseFloat(e.target.value) || 0)}
                  min={0.01}
                  max={consumeLineItem.quantity - consumeLineItem.quantity_consumed}
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project (can transfer to different project)
                </label>
                <select
                  value={consumeProjectId}
                  onChange={(e) => setConsumeProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                >
                  <option value="">Select project...</option>
                  {projects
                    .filter((p) => p.status !== 'completed')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Expense Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Account (5xxx)
                </label>
                <AccountCodeSelector
                  value={consumeAccountCode}
                  onChange={setConsumeAccountCode}
                  filterByType="Expense"
                  placeholder="Select expense account..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={consumeNotes}
                  onChange={(e) => setConsumeNotes(e.target.value)}
                  placeholder="e.g., Used for maintenance"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                />
              </div>

              {/* Cost preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Cost ({consumeQty} x{' '}
                    {consumeLineItem.unit_price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                    ):
                  </span>
                  <span className="font-medium text-gray-900">
                    {purchase.currency}{' '}
                    {(consumeQty * consumeLineItem.unit_price).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Journal: Debit 5xxx (Expense) / Credit 1200 (Inventory)
                </p>
              </div>

              {consumeError && (
                <p className="text-sm text-red-600">{consumeError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConsumeLineItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConsume}
                disabled={isConsuming}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50"
              >
                {isConsuming ? 'Consuming...' : 'Consume'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoidModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Void Purchase
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              This will delete all related journal entries and mark the purchase as void.
              This action cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for voiding <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Duplicate entry, wrong vendor, items returned..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setShowVoidModal(false); setVoidReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={isVoiding || !voidReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isVoiding ? 'Voiding...' : 'Void Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
