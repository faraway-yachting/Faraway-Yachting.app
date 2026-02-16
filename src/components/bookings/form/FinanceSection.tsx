'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Receipt,
  FileCheck,
  Upload,
  FileText,
  X,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Circle,
} from 'lucide-react';
import {
  Booking,
  PaymentStatus,
} from '@/data/booking/types';
import { DynamicSelect } from './DynamicSelect';
import { ExchangeRateField } from '@/components/shared/ExchangeRateField';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import type { Currency } from '@/data/company/types';
import type { CashCollection } from '@/lib/supabase/api/cashCollections';

export interface PaymentRecord {
  id?: string;
  paymentType: 'deposit' | 'balance';
  amount: number;
  currency: string;
  dueDate: string;
  paidDate: string;
  note: string;
  paidToCompanyId?: string;
  receiptId?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  syncedToReceipt?: boolean;
  needsAccountingAction?: boolean;
}

export interface CompanyOption {
  id: string;
  name: string;
}

export interface BankAccountOption {
  id: string;
  account_name: string;
}

export interface LinkedDocument {
  id: string;
  type: 'receipt' | 'invoice' | 'quotation';
  label: string; // e.g. "Invoice issued"
  number: string; // e.g. "RE-2601001"
  status: string; // e.g. "draft", "issued", "paid"
  date: string; // ISO date
  companyId?: string;
  currency?: string;
  totalAmount?: number;
}

interface FinanceSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  errors: Record<string, string>;
  canEdit: boolean;
  isEditing: boolean;
  booking?: Booking | null;
  payments: PaymentRecord[];
  onPaymentsChange: (payments: PaymentRecord[]) => void;
  onUploadFinanceAttachment: (files: File[]) => void;
  onRemoveFinanceAttachment: (index: number) => void;
  autoFilledFields: Set<string>;
  onCreateReceipt?: () => void;
  onCreateInvoice?: () => void;
  linkedDocuments?: LinkedDocument[];
  onViewDocument?: (doc: LinkedDocument) => void;
  cashCollections?: CashCollection[];
  onRecordCash?: () => void;
  onEditCash?: (cash: CashCollection) => void;
  bankAccounts?: BankAccountOption[];
  companies?: CompanyOption[];
  onAddPaymentFromInvoice?: (paymentIndex: number) => void;
  loadBankAccountsForCompany?: (companyId: string) => Promise<BankAccountOption[]>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

export function FinanceSection({
  formData,
  onChange,
  errors,
  canEdit,
  isEditing,
  booking,
  payments,
  onPaymentsChange,
  onUploadFinanceAttachment,
  onRemoveFinanceAttachment,
  autoFilledFields,
  onCreateReceipt,
  onCreateInvoice,
  linkedDocuments = [],
  onViewDocument,
  cashCollections = [],
  onRecordCash,
  onEditCash,
  bankAccounts = [],
  companies = [],
  onAddPaymentFromInvoice,
  loadBankAccountsForCompany,
  isCollapsed,
  onToggleCollapse,
  isCompleted,
  onToggleCompleted,
}: FinanceSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state: fxState, fetchRate, setManualRate, clearRate } = useExchangeRate();

  const currency = formData.currency || 'THB';
  const isNonThb = currency !== 'THB';
  const fxRate = fxState.rate ?? formData.fxRate ?? null;

  // Auto-fetch exchange rate when currency changes
  const prevCurrencyRef = useRef(currency);
  useEffect(() => {
    if (currency !== prevCurrencyRef.current) {
      prevCurrencyRef.current = currency;
      if (currency === 'THB') {
        clearRate();
        onChange('fxRate', undefined);
        onChange('fxRateSource', undefined);
        onChange('thbTotalPrice', undefined);
      } else {
        fetchRate(currency as Currency, formData.dateFrom || undefined);
      }
    }
  }, [currency]);

  // Initialize rate from saved data on mount
  useEffect(() => {
    if (isNonThb && formData.fxRate && !fxState.rate) {
      setManualRate(formData.fxRate);
    }
  }, []);

  // Sync rate to formData when it changes
  const handleFetchRate = useCallback(() => {
    fetchRate(currency as Currency, formData.dateFrom || undefined).then((rate) => {
      if (rate) {
        onChange('fxRate', rate);
        onChange('fxRateSource', 'api');
      }
    });
  }, [currency, formData.dateFrom, fetchRate]);

  const handleManualRate = useCallback((rate: number) => {
    setManualRate(rate);
    onChange('fxRate', rate);
    onChange('fxRateSource', 'manual');
  }, [setManualRate, onChange]);

  const charterFee = formData.charterFee || 0;
  const extraCharges = formData.extraCharges || 0;
  const adminFee = formData.adminFee || 0;
  const totalCost = charterFee + extraCharges + adminFee;

  // THB equivalents
  const thbCharterFee = isNonThb && fxRate ? Math.round(charterFee * fxRate * 100) / 100 : null;
  const thbExtraCharges = isNonThb && fxRate ? Math.round(extraCharges * fxRate * 100) / 100 : null;
  const thbAdminFee = isNonThb && fxRate ? Math.round(adminFee * fxRate * 100) / 100 : null;
  const thbTotal = isNonThb && fxRate ? Math.round(totalCost * fxRate * 100) / 100 : null;

  // Sync THB total to formData
  useEffect(() => {
    if (thbTotal !== null) {
      onChange('thbTotalPrice', thbTotal);
    }
  }, [thbTotal]);

  // Payment summary calculations
  const paidPayments = payments.filter(p => p.paidDate && p.amount > 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const hasPaidPayments = paidPayments.length > 0;
  const suggestedStatus: PaymentStatus | null = payments.length === 0
    ? null
    : totalPaid <= 0
      ? 'unpaid'
      : totalPaid >= totalCost && totalCost > 0
        ? 'paid'
        : 'partial';
  const formatPaymentDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtAmt = (n: number, cur: string) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` ${cur}`;

  const getAutoFillClass = (field: string) => {
    return autoFilledFields.has(field) ? 'bg-blue-50 ring-2 ring-blue-200' : '';
  };

  const invoiceDocuments = linkedDocuments.filter(d => d.type === 'invoice');
  const [paymentBankAccounts, setPaymentBankAccounts] = useState<Record<number, BankAccountOption[]>>({});
  const [addingPaymentIndex, setAddingPaymentIndex] = useState<number | null>(null);

  const addPayment = () => {
    onPaymentsChange([
      ...payments,
      {
        paymentType: 'deposit',
        amount: 0,
        currency: formData.currency || 'THB',
        dueDate: '',
        paidDate: '',
        note: '',
        receiptId: undefined,
        paymentMethod: undefined,
        bankAccountId: undefined,
        syncedToReceipt: false,
      },
    ]);
  };

  const updatePayment = (index: number, field: keyof PaymentRecord, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    onPaymentsChange(updated);
  };

  const removePayment = (index: number) => {
    onPaymentsChange(payments.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFinanceAttachment(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="bg-green-50 rounded-lg p-4">
      <div
        className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-green-100 cursor-pointer select-none ${
          isCollapsed ? '-mb-4 rounded-b-lg' : 'mb-3'
        }`}
        onClick={onToggleCollapse}
      >
        <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleCompleted?.(); }}
            className="flex-shrink-0 hover:scale-110 transition-transform"
            disabled={!onToggleCompleted}
          >
            {isCompleted
              ? <CheckCircle2 className="h-5 w-5 text-green-500" />
              : <Circle className="h-5 w-5 text-gray-400" />
            }
          </button>
          <DollarSign className="h-4 w-4 text-green-600" />
          Finance
        </h3>
        <div className="flex items-center gap-2">
          {!isCollapsed && isEditing && canEdit && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateReceipt?.(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Receipt className="h-4 w-4" />
                Create Receipt
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateInvoice?.(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileCheck className="h-4 w-4" />
                Create Invoice
              </button>
            </>
          )}
          {!isCollapsed && !isEditing && (
            <p className="text-xs text-gray-400 italic">Save booking to create receipts/invoices</p>
          )}
          {onToggleCollapse && (
            <ChevronDown className={`h-4 w-4 text-green-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
          )}
        </div>
      </div>

      {!isCollapsed && <div className="space-y-4">
        {/* Currency selector */}
        <div className="flex items-end gap-4">
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Currency</label>
            <DynamicSelect
              category="currency"
              value={formData.currency || 'THB'}
              onChange={(val) => onChange('currency', val)}
              disabled={!canEdit}
              placeholder="Currency..."
            />
          </div>
          {isNonThb && (
            <div className="flex-1 max-w-md">
              <ExchangeRateField
                currency={currency as Currency}
                date={formData.dateFrom || new Date().toISOString().split('T')[0]}
                rate={fxRate}
                source={fxState.source ?? (formData.fxRateSource as any) ?? null}
                isLoading={fxState.isLoading}
                error={fxState.error}
                isManualOverride={fxState.isManualOverride}
                onFetchRate={handleFetchRate}
                onManualRate={handleManualRate}
                disabled={!canEdit}
              />
            </div>
          )}
        </div>

        {/* Charter Fee, Extra Charges, Admin Fee, Total Cost */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Charter Fee</label>
            <input
              type="number"
              value={formData.charterFee || ''}
              onChange={(e) => onChange('charterFee', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={!canEdit || formData.type === 'cabin_charter'}
              readOnly={formData.type === 'cabin_charter'}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all ${getAutoFillClass('charterFee')}`}
            />
            {formData.type === 'cabin_charter' && (
              <span className="text-xs text-gray-400 mt-0.5 block">Sum from cabin allocations</span>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Extra Charges</label>
            <input
              type="number"
              value={extraCharges || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
            {(formData.extraItems || []).length > 0 && (
              <span className="text-xs text-gray-400 mt-0.5 block">
                From {(formData.extraItems || []).length} extra(s)
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Admin Fee</label>
            <input
              type="number"
              value={formData.adminFee || ''}
              onChange={(e) => onChange('adminFee', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={!canEdit}
              placeholder="CC fee"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Total Cost</label>
            <input
              type="number"
              value={totalCost || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 font-medium"
            />
          </div>
        </div>

        {/* THB equivalent row */}
        {isNonThb && fxRate && (charterFee > 0 || extraCharges > 0 || adminFee > 0) && (
          <div className="grid grid-cols-4 gap-4 -mt-2">
            <div className="text-xs text-gray-400 text-right">
              {thbCharterFee !== null && `THB ${thbCharterFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </div>
            <div className="text-xs text-gray-400 text-right">
              {thbExtraCharges !== null && thbExtraCharges > 0 && `THB ${thbExtraCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </div>
            <div className="text-xs text-gray-400 text-right">
              {thbAdminFee !== null && thbAdminFee > 0 && `THB ${thbAdminFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </div>
            <div className="text-xs text-gray-500 font-medium text-right">
              {thbTotal !== null && `THB ${thbTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment Status</label>
          <DynamicSelect
            category="payment_status"
            value={formData.paymentStatus || 'unpaid'}
            onChange={(val) => onChange('paymentStatus', val as PaymentStatus)}
            disabled={!canEdit}
            placeholder="Select payment status..."
            allowEditOptions={canEdit}
          />
        </div>

        {/* Auto-suggest payment status */}
        {suggestedStatus && suggestedStatus !== formData.paymentStatus && (
          <p className="text-xs text-amber-600 -mt-2">
            Suggested: <span className="font-medium capitalize">{suggestedStatus}</span>
            {' '}({fmtAmt(totalPaid, formData.currency || 'THB')} / {fmtAmt(totalCost, formData.currency || 'THB')} paid)
          </p>
        )}

        {/* Payment Summary */}
        {hasPaidPayments && (
          <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
            <div className="space-y-1.5">
              {payments.map((p, i) => {
                if (p.paidDate && p.amount > 0) {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <span className="text-gray-700 capitalize">{p.paymentType}</span>
                      <span className="font-medium text-gray-900">{fmtAmt(p.amount, p.currency)}</span>
                      <span className="text-gray-500">on {formatPaymentDate(p.paidDate)}</span>
                    </div>
                  );
                }
                if (p.amount > 0 && !p.paidDate) {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 capitalize">{p.paymentType}</span>
                      <span className="text-gray-500">{fmtAmt(p.amount, p.currency)}</span>
                      <span className="text-gray-400">— not yet paid</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <div className={`mt-2 pt-2 border-t text-sm font-medium ${
              totalPaid >= totalCost && totalCost > 0
                ? 'border-green-200 text-green-700'
                : 'border-amber-200 text-amber-700'
            }`}>
              Total Paid: {fmtAmt(totalPaid, formData.currency || 'THB')} / {fmtAmt(totalCost, formData.currency || 'THB')}
              {totalCost > 0 && totalPaid < totalCost && (
                <span className="ml-2 text-gray-500 font-normal">
                  (Remaining: {fmtAmt(totalCost - totalPaid, formData.currency || 'THB')})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions - document timeline */}
        {linkedDocuments.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-2">Actions</label>
            <div className="space-y-1.5">
              {linkedDocuments.map((doc) => {
                const isReceipt = doc.type === 'receipt';
                const isInvoice = doc.type === 'invoice';
                const Icon = isInvoice ? FileCheck : isReceipt ? Receipt : FileText;
                const iconColor = isReceipt ? 'text-green-600' : isInvoice ? 'text-blue-600' : 'text-purple-600';
                const statusColors: Record<string, string> = {
                  draft: 'bg-gray-100 text-gray-600',
                  issued: 'bg-blue-100 text-blue-700',
                  paid: 'bg-green-100 text-green-700',
                  void: 'bg-red-100 text-red-600',
                };
                const statusClass = statusColors[doc.status] || 'bg-gray-100 text-gray-600';
                const formattedDate = new Date(doc.date).toLocaleDateString('en-GB', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                });
                return (
                  <button
                    key={`${doc.type}-${doc.id}`}
                    type="button"
                    onClick={() => onViewDocument?.(doc)}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Icon className={`h-4 w-4 ${iconColor} shrink-0`} />
                    <span className="text-xs text-gray-400 w-20 shrink-0">{formattedDate}</span>
                    <span className="text-sm text-gray-700">{doc.label}</span>
                    <span className="text-sm font-medium text-[#5A7A8F]">{doc.number}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${statusClass} capitalize`}>{doc.status}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Records */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-gray-500">Payment Records</label>
            {canEdit && (
              <button
                type="button"
                onClick={addPayment}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f] transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Payment
              </button>
            )}
          </div>

          {payments.length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">No payment records yet.</p>
          )}

          <div className="space-y-2">
            {payments.map((payment, index) => (
              <div
                key={payment.id || index}
                className={`bg-white p-3 rounded-lg border ${payment.syncedToReceipt ? 'border-green-200' : 'border-gray-200'}`}
              >
                {/* Row 1: Type, Amount, Currency, Payment Method, Paid Date, Note, Delete */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr_1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <DynamicSelect
                      category="payment_type"
                      value={payment.paymentType}
                      onChange={(val) => updatePayment(index, 'paymentType', val)}
                      disabled={!canEdit}
                      placeholder="Type..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Amount</label>
                    <input
                      type="number"
                      value={payment.amount || ''}
                      onChange={(e) => updatePayment(index, 'amount', e.target.value ? parseFloat(e.target.value) : 0)}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Currency</label>
                    <DynamicSelect
                      category="currency"
                      value={payment.currency}
                      onChange={(val) => updatePayment(index, 'currency', val)}
                      disabled={!canEdit}
                      placeholder="Currency..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Paid To</label>
                    <select
                      value={payment.paidToCompanyId || ''}
                      onChange={(e) => updatePayment(index, 'paidToCompanyId', e.target.value || undefined)}
                      disabled={!canEdit || payment.syncedToReceipt}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select company...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Bank Account</label>
                    <select
                      value={payment.paymentMethod === 'cash' ? 'cash' : (payment.bankAccountId || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = [...payments];
                        if (val === 'cash') {
                          updated[index] = { ...updated[index], paymentMethod: 'cash', bankAccountId: undefined };
                        } else if (val) {
                          updated[index] = { ...updated[index], paymentMethod: 'bank_transfer', bankAccountId: val };
                        } else {
                          updated[index] = { ...updated[index], paymentMethod: undefined, bankAccountId: undefined };
                        }
                        onPaymentsChange(updated);
                      }}
                      disabled={!canEdit || payment.syncedToReceipt}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select...</option>
                      <option value="cash">Cash</option>
                      {bankAccounts.map(ba => (
                        <option key={ba.id} value={ba.id}>{ba.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Paid Date</label>
                    <input
                      type="date"
                      value={payment.paidDate}
                      onChange={(e) => updatePayment(index, 'paidDate', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {payment.syncedToReceipt && (
                      <span title="Synced to receipt"><CheckCircle2 className="h-4 w-4 text-green-500" /></span>
                    )}
                    {payment.needsAccountingAction && !payment.syncedToReceipt && (
                      <span title="Pending accounting action"><AlertCircle className="h-4 w-4 text-yellow-500" /></span>
                    )}
                    {canEdit && !payment.syncedToReceipt && (
                      <button
                        type="button"
                        onClick={() => removePayment(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Row 2: Link to Invoice + Create Receipt */}
                {canEdit && !payment.syncedToReceipt && invoiceDocuments.length > 0 && (
                  <div className="flex items-end gap-2 mt-2 pt-2 border-t border-gray-100">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Link to Invoice</label>
                      <select
                        value={payment.receiptId || ''}
                        onChange={async (e) => {
                          const invoiceId = e.target.value || undefined;
                          const updated = [...payments];
                          updated[index] = { ...updated[index], receiptId: invoiceId };
                          onPaymentsChange(updated);
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select invoice...</option>
                        {invoiceDocuments.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.number} — {doc.status}</option>
                        ))}
                      </select>
                    </div>
                    {payment.receiptId && (payment.bankAccountId || payment.paymentMethod === 'cash') && payment.amount > 0 && payment.paidDate && (
                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={addingPaymentIndex === index}
                          onClick={async () => {
                            if (!onAddPaymentFromInvoice) return;
                            setAddingPaymentIndex(index);
                            try {
                              await onAddPaymentFromInvoice(index);
                            } finally {
                              setAddingPaymentIndex(null);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Receipt className="h-4 w-4" />
                          {addingPaymentIndex === index ? 'Creating...' : 'Add Payment'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Synced indicator row */}
                {payment.syncedToReceipt && (
                  <div className="mt-2 pt-2 border-t border-green-100 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Synced to receipt · {payment.paymentMethod || 'unknown method'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cash Collections */}
        {isEditing && booking?.id && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-gray-500 flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                Cash Collections
              </label>
              {canEdit && onRecordCash && (
                <button
                  type="button"
                  onClick={onRecordCash}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record Cash
                </button>
              )}
            </div>
            {cashCollections.length > 0 ? (
              <div className="space-y-1">
                {cashCollections.map((c) => {
                  const canEditCash = canEdit && onEditCash && c.status === 'collected';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => canEditCash && onEditCash(c)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 bg-white rounded border border-gray-200 text-sm ${
                        canEditCash ? 'hover:bg-gray-50 hover:border-[#5A7A8F]/30 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span className="font-medium text-gray-900">
                        {c.currency} {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          c.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          c.status === 'pending_handover' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.status === 'pending_handover' ? 'Pending' : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                        {canEditCash && (
                          <span className="text-xs text-gray-400">Edit</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <p className="text-xs text-gray-400 mt-1">
                  Total: {cashCollections.reduce((s, c) => s + c.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {cashCollections[0]?.currency || 'THB'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No cash collected for this booking</p>
            )}
          </div>
        )}

        {/* Charter Expense (External Boats) */}
        {formData.externalBoatName && (
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <DollarSign className="h-4 w-4" />
              Charter Expense (External Boat)
            </label>

            {/* Charter Cost Input + Currency */}
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Charter Cost to Boat Owner</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.charterCost || ''}
                  onChange={(e) => onChange('charterCost', e.target.value ? parseFloat(e.target.value) : 0)}
                  placeholder="0.00"
                  disabled={!canEdit}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Currency</label>
                <DynamicSelect
                  category="currency"
                  value={formData.charterCostCurrency || formData.currency || 'THB'}
                  onChange={(val) => onChange('charterCostCurrency', val)}
                  disabled={!canEdit}
                  placeholder="Currency..."
                />
              </div>
            </div>

            {/* Profit Summary */}
            {(formData.charterCost ?? 0) > 0 && (() => {
              const guestPaidRaw = (formData.charterFee || 0) + (formData.extraCharges || 0);
              const costRaw = formData.charterCost || 0;
              const bookingCur = formData.currency || 'THB';
              const costCur = formData.charterCostCurrency || bookingCur;
              const sameCurrency = bookingCur === costCur;

              // Normalize to THB when currencies differ
              let guestPaidNorm = guestPaidRaw;
              let costNorm = costRaw;
              let profitCur = bookingCur;
              let canCompare = true;

              if (!sameCurrency) {
                profitCur = 'THB';
                // Convert guest paid to THB
                if (bookingCur === 'THB') {
                  guestPaidNorm = guestPaidRaw;
                } else if (fxRate) {
                  guestPaidNorm = Math.round(guestPaidRaw * fxRate * 100) / 100;
                } else {
                  canCompare = false;
                }
                // Convert cost to THB
                if (costCur === 'THB') {
                  costNorm = costRaw;
                } else {
                  // Cost in foreign currency without its own FX rate — can't normalize
                  canCompare = false;
                }
              }

              const grossProfit = guestPaidNorm - costNorm;
              const fmt = (n: number) => n.toLocaleString('en', { minimumFractionDigits: 2 });

              return (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Profit Summary{!sameCurrency && canCompare ? ' (THB)' : ''}
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Guest Paid (Charter + Extras)
                        {!sameCurrency && canCompare && bookingCur !== 'THB' && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({fmt(guestPaidRaw)} {bookingCur} × {fxRate})
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {canCompare ? fmt(guestPaidNorm) : `${fmt(guestPaidRaw)} ${bookingCur}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Boat Owner Cost</span>
                      <span className="font-medium text-red-600">
                        -{canCompare ? fmt(costNorm) : `${fmt(costRaw)} ${costCur}`}
                      </span>
                    </div>
                    {canCompare ? (
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-gray-800 font-medium">Gross Profit</span>
                        <span className={`font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmt(grossProfit)}
                        </span>
                      </div>
                    ) : (
                      <div className="border-t pt-1 mt-1 text-xs text-amber-600">
                        Cannot compare — set exchange rate to see profit in THB
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Paid to Boat Operator */}
            {(() => {
              const operatorTotalPaid = (formData.operatorDepositAmount || 0) + (formData.operatorBalanceAmount || 0);
              const charterCost = formData.charterCost || 0;
              const opCurrency = formData.charterCostCurrency || formData.currency || 'THB';
              const hasAnyPayment = (formData.operatorDepositAmount ?? 0) > 0 || (formData.operatorBalanceAmount ?? 0) > 0;
              return (
                <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-3">
                  <p className="text-xs font-medium text-gray-500">Paid to Boat Operator</p>
                  <div className="grid grid-cols-[80px_1fr_1fr] gap-2 items-end">
                    <span className="text-xs text-gray-500 py-1.5">Deposit</span>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.operatorDepositAmount ?? ''}
                        onChange={(e) => onChange('operatorDepositAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={!canEdit}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Paid Date</label>
                      <input
                        type="date"
                        value={formData.operatorDepositPaidDate || ''}
                        onChange={(e) => onChange('operatorDepositPaidDate', e.target.value || undefined)}
                        disabled={!canEdit}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    <span className="text-xs text-gray-500 py-1.5">Balance</span>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.operatorBalanceAmount ?? ''}
                        onChange={(e) => onChange('operatorBalanceAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={!canEdit}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={formData.operatorBalancePaidDate || ''}
                        onChange={(e) => onChange('operatorBalancePaidDate', e.target.value || undefined)}
                        disabled={!canEdit}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                  {hasAnyPayment && (
                    <div className={`text-xs pt-2 border-t border-gray-100 font-medium ${
                      operatorTotalPaid >= charterCost ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      Total Paid: {operatorTotalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} / {charterCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} {opCurrency}
                      {operatorTotalPaid >= charterCost
                        ? <span className="ml-1">— Fully Paid</span>
                        : <span className="ml-1 text-gray-500 font-normal">(Remaining: {(charterCost - operatorTotalPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })} {opCurrency})</span>
                      }
                    </div>
                  )}
                  <div>
                    <input
                      type="text"
                      value={formData.operatorPaymentNote || ''}
                      onChange={(e) => onChange('operatorPaymentNote', e.target.value || undefined)}
                      disabled={!canEdit}
                      placeholder="Payment note (e.g., wire transfer, cash to captain...)"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Accounting Status & Action */}
            {isEditing && booking?.id && (formData.charterCost ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                {formData.linkedExpenseId ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-700">
                      {formData.charterExpenseStatus === 'fully_paid' ? 'Expense fully paid' : 'Expense recorded'}
                    </span>
                    <a
                      href={`/accounting/manager/expenses/expense-records/${formData.linkedExpenseId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline ml-2"
                    >
                      View Expense
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-amber-700">Pending accounting action</span>
                  </div>
                )}
                {!formData.linkedExpenseId && (
                  <a
                    href={`/accounting/manager/expenses/expense-records/new?booking_id=${booking.id}&amount=${formData.charterCost || 0}&currency=${encodeURIComponent(formData.charterCostCurrency || formData.currency || 'THB')}&account_code=5530&vendor_name=${encodeURIComponent(formData.externalBoatName || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    Record Expense
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Finance Note */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Finance Note</label>
          <input
            type="text"
            value={formData.financeNote || ''}
            onChange={(e) => onChange('financeNote', e.target.value)}
            placeholder="Additional finance notes..."
            disabled={!canEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Attachment Upload */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Attachments</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onClick={() => canEdit && fileInputRef.current?.click()}
            className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
              canEdit
                ? 'border-gray-300 hover:border-[#5A7A8F] hover:bg-[#5A7A8F]/5 cursor-pointer'
                : 'border-gray-200 bg-gray-100'
            }`}
          >
            <Upload className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Click to upload files</span>
          </div>

          {/* Uploaded files list */}
          {formData.financeAttachments && formData.financeAttachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.financeAttachments.map((att, index) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded border border-gray-200"
                >
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#5A7A8F] hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    {att.name}
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onRemoveFinanceAttachment(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>}
    </div>
  );
}
