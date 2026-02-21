'use client';

import React from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import type {
  InventoryPurchaseItem,
  ExpensePricingType,
} from '@/data/expenses/types';
import type { Currency } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import { generateId, calculateLineItem } from '@/lib/expenses/utils';


interface InventoryPurchaseLineItemEditorProps {
  lineItems: InventoryPurchaseItem[];
  onChange: (items: InventoryPurchaseItem[]) => void;
  pricingType: ExpensePricingType;
  currency: Currency;
  projects: Project[];
  readOnly?: boolean;
  exchangeRate?: number;
}

export function InventoryPurchaseLineItemEditor({
  lineItems,
  onChange,
  pricingType,
  currency,
  projects,
  readOnly = false,
  exchangeRate,
}: InventoryPurchaseLineItemEditorProps) {
  const handleAddLineItem = () => {
    const newItem: InventoryPurchaseItem = {
      id: generateId(),
      description: '',


      quantity: 1,
      quantityConsumed: 0,
      unitPrice: 0,
      taxRate: pricingType === 'no_vat' ? 0 : 7,
      amount: 0,
      preVatAmount: 0,
      projectId: '',
      accountCode: '1200', // Always inventory asset
      expenseAccountCode: '',
    };
    onChange([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, updates: Partial<InventoryPurchaseItem>) => {
    const updated = lineItems.map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, ...updates };

      if (
        'quantity' in updates ||
        'unitPrice' in updates ||
        'taxRate' in updates
      ) {
        const calculated = calculateLineItem(
          updatedItem.quantity,
          updatedItem.unitPrice,
          updatedItem.taxRate,
          0, // No WHT for inventory purchases
          'pre_vat',
          pricingType,
          undefined
        );

        updatedItem.amount = calculated.amount;
        updatedItem.preVatAmount = calculated.preVatAmount;
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

  const hasMissingProjects = lineItems.some((item) => !item.projectId);

  return (
    <div className="space-y-4">
      {projects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            No projects found. Please create a project first.
          </p>
        </div>
      )}

      {hasMissingProjects && lineItems.length > 0 && projects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Project is required for each line item.
          </p>
        </div>
      )}

      {/* Line Items Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
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
              {!readOnly && (
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
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
                      {/* Project */}
                      <td className="px-3 pt-3 pb-1">
                        <select
                          value={item.projectId}
                          onChange={(e) =>
                            handleUpdateLineItem(item.id, { projectId: e.target.value })
                          }
                          disabled={readOnly}
                          className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50 ${
                            !hasProject ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
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
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50"
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
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50"
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
                          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50"
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
                            className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-50"
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

                      {/* Remove */}
                      {!readOnly && (
                        <td className="px-3 pt-3 pb-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove line item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      )}
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
              {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {pricingType !== 'no_vat' && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">VAT Amount:</span>
              <span className="text-sm font-medium text-gray-900">
                {currency}{' '}
                {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-between w-full max-w-md border-t pt-2">
            <span className="text-base font-semibold text-gray-900">Total Amount:</span>
            <div className="text-right">
              <span className="text-base font-bold text-gray-900">
                {currency}{' '}
                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {currency !== 'THB' && exchangeRate && totalAmount > 0 && (
                <div className="text-sm text-orange-600">
                  (THB {(totalAmount * exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
