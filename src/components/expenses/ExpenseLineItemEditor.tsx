'use client';

import React from 'react';
import { Plus, X, AlertCircle, Paperclip } from 'lucide-react';
import type {
  ExpenseLineItem,
  ExpensePricingType,
  WhtRate,
} from '@/data/expenses/types';
import type { Currency } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import { generateId, calculateLineItem } from '@/lib/expenses/utils';
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

// WHT base calculation is always pre_vat (simplified)

interface ExpenseLineItemEditorProps {
  lineItems: ExpenseLineItem[];
  onChange: (items: ExpenseLineItem[]) => void;
  pricingType: ExpensePricingType;
  currency: Currency;
  projects: Project[];
  readOnly?: boolean;
  showAttachmentButton?: boolean;
  onAttachmentClick?: (lineItemId: string) => void;
  exchangeRate?: number; // For THB conversion display
}

export function ExpenseLineItemEditor({
  lineItems,
  onChange,
  pricingType,
  currency,
  projects,
  readOnly = false,
  showAttachmentButton = false,
  onAttachmentClick,
  exchangeRate,
}: ExpenseLineItemEditorProps) {
  const handleAddLineItem = () => {
    const newItem: ExpenseLineItem = {
      id: generateId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: pricingType === 'no_vat' ? 0 : 7, // Default VAT rate
      whtRate: 0,
      whtBaseCalculation: 'pre_vat',
      customWhtAmount: undefined,
      amount: 0,
      preVatAmount: 0,
      whtAmount: 0,
      projectId: '', // Required - must be selected
      accountCode: '',
    };
    onChange([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, updates: Partial<ExpenseLineItem>) => {
    const updated = lineItems.map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, ...updates };

      // Recalculate amounts when relevant fields change
      if (
        'quantity' in updates ||
        'unitPrice' in updates ||
        'taxRate' in updates ||
        'whtRate' in updates ||
        'whtBaseCalculation' in updates ||
        'customWhtAmount' in updates
      ) {
        const calculated = calculateLineItem(
          updatedItem.quantity,
          updatedItem.unitPrice,
          updatedItem.taxRate,
          updatedItem.whtRate,
          updatedItem.whtBaseCalculation,
          pricingType,
          updatedItem.customWhtAmount
        );

        updatedItem.amount = calculated.amount;
        updatedItem.preVatAmount = calculated.preVatAmount;
        updatedItem.whtAmount = calculated.whtAmount;
      }

      return updatedItem;
    });

    onChange(updated);
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.preVatAmount, 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    if (pricingType === 'exclude_vat') {
      return sum + item.preVatAmount * (item.taxRate / 100);
    } else if (pricingType === 'include_vat') {
      return sum + (item.amount - item.preVatAmount);
    }
    return sum;
  }, 0);
  const totalAmount = subtotal + taxAmount;
  const whtAmount = lineItems.reduce((sum, item) => sum + item.whtAmount, 0);
  const netPayable = totalAmount - whtAmount;

  // Check if any line item is missing a project
  const hasMissingProjects = lineItems.some((item) => !item.projectId);

  return (
    <div className="space-y-4">
      {/* Warning when no projects available */}
      {projects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            No projects found. Please create a project in{' '}
            <a href="/accounting/manager/settings" className="font-medium underline hover:text-amber-900">
              Settings
            </a>{' '}
            first.
          </p>
        </div>
      )}

      {/* Warning for missing projects */}
      {hasMissingProjects && lineItems.length > 0 && projects.length > 0 && (
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
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Qty
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Unit Price
              </th>
              {pricingType !== 'no_vat' && (
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  VAT %
                </th>
              )}
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Amount
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                WHT
              </th>
              {!readOnly && (
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
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
                          onChange={(e) =>
                            handleUpdateLineItem(item.id, { projectId: e.target.value })
                          }
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

                      {/* Description */}
                      <td className="px-3 pt-3 pb-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateLineItem(item.id, { description: e.target.value })
                          }
                          disabled={readOnly}
                          placeholder="Enter description..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-3 pt-3 pb-1">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLineItem(item.id, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={readOnly}
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 pt-3 pb-1">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateLineItem(item.id, {
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={readOnly}
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </td>

                      {/* VAT % */}
                      {pricingType !== 'no_vat' && (
                        <td className="px-3 pt-3 pb-1">
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, {
                                taxRate: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={readOnly}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </td>
                      )}

                      {/* Amount */}
                      <td className="px-3 pt-3 pb-1">
                        <div className="text-sm font-medium text-gray-900 text-right">
                          {item.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>

                      {/* WHT - Display amount */}
                      <td className="px-3 pt-3 pb-1">
                        {item.whtRate === 'custom' ? (
                          <input
                            type="number"
                            value={item.customWhtAmount || ''}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, {
                                customWhtAmount: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={readOnly}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900 text-right">
                            {item.whtAmount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        )}
                      </td>

                      {/* Actions - spans 2 rows */}
                      {!readOnly && (
                        <td className="px-3 pt-3 pb-1 text-center" rowSpan={2}>
                          <div className="flex items-center justify-center gap-1">
                            {showAttachmentButton && onAttachmentClick && (
                              <button
                                type="button"
                                onClick={() => onAttachmentClick(item.id)}
                                className="p-1 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors relative"
                                title="Attach file"
                              >
                                <Paperclip className="h-4 w-4" />
                                {item.attachments && item.attachments.length > 0 && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#5A7A8F] text-white text-[10px] rounded-full flex items-center justify-center">
                                    {item.attachments.length}
                                  </span>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove line item"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Secondary row - Account selector and WHT rate selector */}
                    <tr className="hover:bg-gray-50 border-b border-gray-200">
                      <td className="pt-0 pb-2"></td>
                      <td className="px-3 pt-0 pb-2">
                        <AccountCodeSelector
                          value={item.accountCode || ''}
                          onChange={(code) => handleUpdateLineItem(item.id, { accountCode: code })}
                          filterByType="Expense"
                          placeholder="Select account..."
                          disabled={readOnly}
                          size="sm"
                          variant="minimal"
                        />
                      </td>
                      <td colSpan={pricingType !== 'no_vat' ? 4 : 3} className="pt-0 pb-2"></td>
                      <td className="px-3 pt-0 pb-2">
                        <select
                          value={String(item.whtRate)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              handleUpdateLineItem(item.id, { whtRate: 'custom' });
                            } else {
                              const numVal = parseFloat(val);
                              handleUpdateLineItem(item.id, {
                                whtRate: numVal as WhtRate,
                                customWhtAmount: undefined,
                              });
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
          type="button"
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
              {currency}{' '}
              {subtotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {pricingType !== 'no_vat' && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">VAT Amount:</span>
              <span className="text-sm font-medium text-gray-900">
                {currency}{' '}
                {taxAmount.toLocaleString('en-US', {
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
                {currency}{' '}
                {totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {currency !== 'THB' && exchangeRate && totalAmount > 0 && (
                <div className="text-sm text-orange-600">
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
                <span className="text-sm text-gray-600">Less: Withholding Tax:</span>
                <span className="text-sm font-medium text-red-600">
                  ({currency}{' '}
                  {whtAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </span>
              </div>

              <div className="flex justify-between w-full max-w-md border-t pt-2">
                <span className="text-base font-semibold text-gray-900">Net Payable:</span>
                <span className="text-base font-bold text-[#5A7A8F]">
                  {currency}{' '}
                  {netPayable.toLocaleString('en-US', {
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
