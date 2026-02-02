'use client';

import { useRef, useState } from 'react';
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
} from 'lucide-react';
import {
  Booking,
  PaymentStatus,
} from '@/data/booking/types';
import { DynamicSelect } from './DynamicSelect';
import type { CashCollection } from '@/lib/supabase/api/cashCollections';

export interface PaymentRecord {
  id?: string;
  paymentType: 'deposit' | 'balance';
  amount: number;
  currency: string;
  dueDate: string;
  paidDate: string;
  note: string;
  receiptId?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  syncedToReceipt?: boolean;
  needsAccountingAction?: boolean;
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
  bankAccounts?: BankAccountOption[];
  onAddPaymentFromInvoice?: (paymentIndex: number) => void;
  loadBankAccountsForCompany?: (companyId: string) => Promise<BankAccountOption[]>;
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
  bankAccounts = [],
  onAddPaymentFromInvoice,
  loadBankAccountsForCompany,
}: FinanceSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charterFee = formData.charterFee || 0;
  const extraCharges = formData.extraCharges || 0;
  const adminFee = formData.adminFee || 0;
  const totalCost = charterFee + extraCharges + adminFee;

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
      <div className="flex items-center justify-between px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-green-100">
        <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Finance
        </h3>
        {isEditing && canEdit ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Receipt className="h-4 w-4" />
              Create Receipt
            </button>
            <button
              type="button"
              onClick={onCreateInvoice}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FileCheck className="h-4 w-4" />
              Create Invoice
            </button>
          </div>
        ) : (
          !isEditing && (
            <p className="text-xs text-gray-400 italic">Save booking to create receipts/invoices</p>
          )
        )}
      </div>

      <div className="space-y-4">
        {/* Charter Fee, Extra Charges, Admin Fee, Total Cost */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Charter Fee</label>
            <input
              type="number"
              value={formData.charterFee || ''}
              onChange={(e) => onChange('charterFee', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all ${getAutoFillClass('charterFee')}`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Extra Charges</label>
            <input
              type="number"
              value={formData.extraCharges || ''}
              onChange={(e) => onChange('extraCharges', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
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
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded transition-colors"
              >
                <Plus className="h-3 w-3" />
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
                {/* Row 1: Type, Amount, Currency, Due Date, Paid Date, Note, Delete */}
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
                    <label className="block text-xs text-gray-400 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={payment.dueDate}
                      onChange={(e) => updatePayment(index, 'dueDate', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
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
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Note</label>
                    <input
                      type="text"
                      value={payment.note}
                      onChange={(e) => updatePayment(index, 'note', e.target.value)}
                      placeholder="Note..."
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
                {/* Row 2: Link to Invoice, Payment Method, Add Payment */}
                {canEdit && !payment.syncedToReceipt && (
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Link to Invoice</label>
                      <select
                        value={payment.receiptId || ''}
                        onChange={async (e) => {
                          const invoiceId = e.target.value || undefined;
                          const updated = [...payments];
                          updated[index] = { ...updated[index], receiptId: invoiceId, bankAccountId: undefined, paymentMethod: undefined };
                          onPaymentsChange(updated);
                          if (invoiceId && loadBankAccountsForCompany) {
                            const doc = invoiceDocuments.find(d => d.id === invoiceId);
                            if (doc?.companyId) {
                              const accounts = await loadBankAccountsForCompany(doc.companyId);
                              setPaymentBankAccounts(prev => ({ ...prev, [index]: accounts }));
                            }
                          } else {
                            setPaymentBankAccounts(prev => ({ ...prev, [index]: [] }));
                          }
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select invoice...</option>
                        {invoiceDocuments.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.number} — {doc.status}</option>
                        ))}
                      </select>
                    </div>
                    {payment.receiptId && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Payment Method</label>
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
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="cash">Cash</option>
                          {(paymentBankAccounts[index] || []).map(ba => (
                            <option key={ba.id} value={ba.id}>{ba.account_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
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
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#5A7A8F] border border-[#5A7A8F]/30 rounded hover:bg-[#5A7A8F]/5"
                >
                  <Plus className="h-3 w-3" />
                  Record Cash
                </button>
              )}
            </div>
            {cashCollections.length > 0 ? (
              <div className="space-y-1">
                {cashCollections.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-1.5 bg-white rounded border border-gray-200 text-sm">
                    <span className="font-medium text-gray-900">
                      {c.currency} {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      c.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      c.status === 'pending_handover' ? 'bg-blue-100 text-blue-800' :
                      c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {c.status === 'pending_handover' ? 'Pending' : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-1">
                  Total: {cashCollections.reduce((s, c) => s + c.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {cashCollections[0]?.currency || 'THB'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No cash collected for this booking</p>
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

      </div>
    </div>
  );
}
