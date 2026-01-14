'use client';

import React from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import type { LineItem, PricingType, WhtRate } from '@/data/income/types';
import type { Currency } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import { calculateLineItemTotal, generateId } from '@/lib/income/utils';
import AccountCodeSelector from '@/components/accounting/AccountCodeSelector';

// WHT rate options for dropdown
const WHT_RATE_OPTIONS: { value: WhtRate; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 0.75, label: '0.75%' },
  { value: 1, label: '1%' },
  { value: 1.5, label: '1.5%' },
  { value: 2, label: '2%' },
  { value: 3, label: '3%' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 'custom', label: 'Custom' },
];

// Helper function to calculate WHT amount for a single line item
const calculateLineWhtAmount = (
  item: LineItem,
  pricingType: PricingType
): number => {
  if (item.whtRate === 0) return 0;
  if (item.whtRate === 'custom') return item.customWhtAmount || 0;

  const lineSubtotal = item.quantity * item.unitPrice;
  let preVatAmount: number;

  if (pricingType === 'include_vat') {
    preVatAmount = lineSubtotal / (1 + item.taxRate / 100);
  } else {
    preVatAmount = lineSubtotal;
  }

  return preVatAmount * (item.whtRate / 100);
};

interface LineItemEditorProps {
  lineItems: LineItem[];
  onChange: (items: LineItem[]) => void;
  pricingType: PricingType;
  currency: Currency;
  projects: Project[];
  readOnly?: boolean;
  exchangeRate?: number; // Exchange rate to THB
}

export default function LineItemEditor({
  lineItems,
  onChange,
  pricingType,
  currency,
  projects,
  readOnly = false,
  exchangeRate,
}: LineItemEditorProps) {
  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: generateId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 7, // Default VAT rate
      whtRate: 0, // Default: None
      customWhtAmount: undefined,
      amount: 0,
      accountCode: '',
      projectId: '', // Required - must be selected
    };
    onChange([...lineItems, newItem]);
  };

  // Check if any line item is missing a project
  const hasMissingProjects = lineItems.some((item) => !item.projectId);

  const handleRemoveLineItem = (id: string) => {
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, updates: Partial<LineItem>) => {
    const updated = lineItems.map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, ...updates };

      // Recalculate amount when quantity, unitPrice, or taxRate changes
      if ('quantity' in updates || 'unitPrice' in updates || 'taxRate' in updates) {
        updatedItem.amount = calculateLineItemTotal(
          updatedItem.quantity,
          updatedItem.unitPrice,
          updatedItem.taxRate,
          pricingType
        );
      }

      return updatedItem;
    });

    onChange(updated);
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    if (pricingType === 'include_vat') {
      // Extract net amount from gross
      return sum + lineSubtotal / (1 + item.taxRate / 100);
    }
    return sum + lineSubtotal;
  }, 0);

  const taxAmount = lineItems.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    if (pricingType === 'exclude_vat') {
      return sum + lineSubtotal * (item.taxRate / 100);
    } else if (pricingType === 'include_vat') {
      const gross = lineSubtotal;
      const net = gross / (1 + item.taxRate / 100);
      return sum + (gross - net);
    }
    return sum; // no_vat
  }, 0);

  const totalAmount = pricingType === 'no_vat' ? subtotal : subtotal + taxAmount;

  // Calculate WHT amount (WHT is calculated from Pre-VAT amount / subtotal per line item)
  const whtAmount = lineItems.reduce((sum, item) => {
    return sum + calculateLineWhtAmount(item, pricingType);
  }, 0);

  // Net amount to pay = Total Amount - WHT Amount
  const netAmountToPay = totalAmount - whtAmount;

  return (
    <div className="space-y-4">
      {/* Warning for missing projects */}
      {hasMissingProjects && lineItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Project is required for each line item. Please select a project for all items.
          </p>
        </div>
      )}

      {/* Line Items Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Project <span className="text-red-500">*</span>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Unit Price
              </th>
              {pricingType !== 'no_vat' && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Tax %
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                WHT
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={pricingType !== 'no_vat' ? (readOnly ? 7 : 8) : (readOnly ? 6 : 7)}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No line items added yet
                </td>
              </tr>
            ) : (
              lineItems.map((item) => {
                const hasProject = !!item.projectId;

                return (
                <React.Fragment key={item.id}>
                  {/* Main row */}
                  <tr className="hover:bg-gray-50">
                    {/* Project Selector (Required) */}
                    <td className="px-3 pt-3 pb-1">
                      <select
                        value={item.projectId}
                        onChange={(e) => handleUpdateLineItem(item.id, { projectId: e.target.value })}
                        disabled={readOnly}
                        className={`
                          w-full px-2 py-1.5 text-sm border rounded
                          focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]
                          disabled:bg-gray-50 disabled:text-gray-500
                          ${!hasProject ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                        `}
                      >
                        <option value="">Select project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.code} - {project.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 pt-3 pb-1">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(item.id, { description: e.target.value })}
                        disabled={readOnly}
                        placeholder="Enter description..."
                        rows={Math.min(30, Math.max(1, (item.description.match(/\n/g) || []).length + 1))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                      />
                    </td>
                    <td className="px-4 pt-3 pb-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLineItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-4 pt-3 pb-1">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </td>
                    {pricingType !== 'no_vat' && (
                      <td className="px-4 pt-3 pb-1">
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => handleUpdateLineItem(item.id, { taxRate: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>
                    )}
                    <td className="px-4 pt-3 pb-1">
                      <div className="text-sm font-medium text-gray-900 text-right">
                        {item.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-4 pt-3 pb-1">
                      {item.whtRate === 'custom' ? (
                        <input
                          type="number"
                          value={item.customWhtAmount || ''}
                          onChange={(e) => handleUpdateLineItem(item.id, { customWhtAmount: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 text-right">
                          {calculateLineWhtAmount(item, pricingType).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-4 pt-3 pb-1 text-center" rowSpan={2}>
                        <button
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove line item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                  {/* Secondary row for Account selector and WHT rate selector */}
                  <tr className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="px-3 pt-0 pb-2"></td>
                    <td className="px-3 pt-0 pb-2">
                      <AccountCodeSelector
                        value={item.accountCode || ''}
                        onChange={(code) => handleUpdateLineItem(item.id, { accountCode: code })}
                        filterByType="Revenue"
                        placeholder="Select account..."
                        disabled={readOnly}
                        size="sm"
                        variant="minimal"
                      />
                    </td>
                    <td colSpan={pricingType !== 'no_vat' ? 4 : 3} className="pt-0 pb-2"></td>
                    <td className="px-4 pt-0 pb-2">
                      <select
                        value={String(item.whtRate)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            handleUpdateLineItem(item.id, { whtRate: 'custom' });
                          } else {
                            const numVal = parseFloat(val);
                            handleUpdateLineItem(item.id, { whtRate: numVal as WhtRate, customWhtAmount: undefined });
                          }
                        }}
                        disabled={readOnly}
                        className="w-full px-1 py-0.5 text-xs text-right text-gray-400 border-0 bg-transparent focus:outline-none focus:ring-0 disabled:bg-transparent disabled:text-gray-400 cursor-pointer"
                      >
                        {WHT_RATE_OPTIONS.map((option) => (
                          <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Line Item Button */}
      {!readOnly && (
        <button
          onClick={handleAddLineItem}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5A7A8F] border border-[#5A7A8F] rounded-lg hover:bg-[#5A7A8F]/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Line Item</span>
        </button>
      )}

      {/* Totals Summary */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex flex-col items-end space-y-2">
          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-medium text-gray-900">
              {currency} {subtotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {pricingType !== 'no_vat' && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">
                Tax Amount:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {currency} {taxAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between w-full max-w-md border-t pt-2">
            <span className="text-base font-semibold text-gray-900">Total Amount:</span>
            <div className="text-right">
              <span className="text-base font-bold text-gray-900">
                {currency} {totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {currency !== 'THB' && exchangeRate && totalAmount > 0 && (
                <div className="text-sm text-[#5A7A8F]">
                  (THB {(totalAmount * exchangeRate).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })})
                </div>
              )}
            </div>
          </div>

          {whtAmount > 0 && (
            <>
              <div className="flex justify-between w-full max-w-md">
                <span className="text-sm text-gray-600">Withholding Tax Amount:</span>
                <span className="text-sm font-medium text-gray-900">
                  {currency} {whtAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex justify-between w-full max-w-md border-t pt-2">
                <span className="text-base font-semibold text-gray-900">Net Amount to Pay:</span>
                <span className="text-base font-bold text-gray-900">
                  {currency} {netAmountToPay.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
