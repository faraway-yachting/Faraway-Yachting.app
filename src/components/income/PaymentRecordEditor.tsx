'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import type { PaymentRecord } from '@/data/income/types';
import type { Currency } from '@/data/company/types';
import type { BankAccount } from '@/data/banking/types';
import { generateId, getTodayISO } from '@/lib/income/utils';

interface BeamGatewayOption {
  id: string;
  merchantName: string;
  merchantId: string;
}

interface PaymentRecordEditorProps {
  payments: PaymentRecord[];
  onChange: (payments: PaymentRecord[]) => void;
  bankAccounts: BankAccount[];
  beamGateways?: BeamGatewayOption[];
  currency: Currency;
  netAmountToPay: number;
  readOnly?: boolean;
}

export default function PaymentRecordEditor({
  payments,
  onChange,
  bankAccounts,
  beamGateways = [],
  currency,
  netAmountToPay,
  readOnly = false,
}: PaymentRecordEditorProps) {
  const handleAddPayment = () => {
    const newPayment: PaymentRecord = {
      id: generateId(),
      paymentDate: getTodayISO(),
      amount: 0,
      receivedAt: '',
      remark: '',
    };
    onChange([...payments, newPayment]);
  };

  const handleRemovePayment = (id: string) => {
    onChange(payments.filter((p) => p.id !== id));
  };

  const handleUpdatePayment = (id: string, updates: Partial<PaymentRecord>) => {
    const updated = payments.map((payment) => {
      if (payment.id !== id) return payment;
      return { ...payment, ...updates };
    });
    onChange(updated);
  };

  // Calculate totals
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = netAmountToPay - totalPayments;

  // Helper to get display name for receivedAt
  const getReceivedAtLabel = (receivedAt: string): string => {
    if (receivedAt === 'cash') return 'Cash';
    if (!receivedAt) return 'Select...';
    if (receivedAt.startsWith('beam:')) {
      const gwId = receivedAt.slice(5);
      const gateway = beamGateways.find((gw) => gw.id === gwId);
      return gateway ? `Beam - ${gateway.merchantName}` : 'Beam';
    }
    const account = bankAccounts.find((ba) => ba.id === receivedAt);
    if (account) {
      return `${account.bankInformation.bankName} - ${account.accountNumber}`;
    }
    return receivedAt;
  };

  return (
    <div className="space-y-4">
      {/* Payments Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                Receive Payment At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remark
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 5 : 6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No payment records added yet
                </td>
              </tr>
            ) : (
              payments.map((payment, index) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={payment.paymentDate}
                      onChange={(e) => handleUpdatePayment(payment.id, { paymentDate: e.target.value })}
                      disabled={readOnly}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={payment.amount || ''}
                      onChange={(e) => handleUpdatePayment(payment.id, { amount: parseFloat(e.target.value) || 0 })}
                      disabled={readOnly}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={payment.receivedAt}
                      onChange={(e) => handleUpdatePayment(payment.id, { receivedAt: e.target.value })}
                      disabled={readOnly}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="">Select account...</option>
                      <option value="cash">Cash</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bankInformation.bankName} - {account.accountNumber} ({account.currency})
                        </option>
                      ))}
                      {beamGateways.length > 0 && (
                        <optgroup label="Beam Payment Gateway">
                          {beamGateways.map((gw) => (
                            <option key={gw.id} value={`beam:${gw.id}`}>
                              Beam - {gw.merchantName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={payment.remark || ''}
                      onChange={(e) => handleUpdatePayment(payment.id, { remark: e.target.value })}
                      disabled={readOnly}
                      placeholder="Optional remark..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemovePayment(payment.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove payment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Payment Button */}
      {!readOnly && (
        <button
          onClick={handleAddPayment}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded-lg hover:bg-[#5A7A8F]/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Payment</span>
        </button>
      )}

      {/* Payment Summary */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex flex-col items-end space-y-2">
          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Net Amount to Pay:</span>
            <span className="text-sm font-medium text-gray-900">
              {currency} {netAmountToPay.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Total Payments:</span>
            <span className="text-sm font-medium text-gray-900">
              {currency} {totalPayments.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-md border-t pt-2">
            <span className="text-base font-semibold text-gray-900">Remaining Amount:</span>
            <span className={`text-base font-bold ${remainingAmount > 0 ? 'text-amber-600' : remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {currency} {remainingAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {remainingAmount !== 0 && (
            <p className={`text-xs ${remainingAmount > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {remainingAmount > 0
                ? `${currency} ${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} still outstanding`
                : `${currency} ${Math.abs(remainingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} overpayment`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
