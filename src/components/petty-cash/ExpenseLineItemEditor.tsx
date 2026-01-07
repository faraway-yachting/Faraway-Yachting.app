'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { PettyCashExpenseLineItem, VatType, WhtRate } from '@/data/petty-cash/types';
import type { Project } from '@/data/project/types';
import type { ExpenseCategory } from '@/data/petty-cash/types';
import {
  calculateLineItemAmounts,
  createEmptyLineItem,
  formatNumber,
  VAT_TYPE_OPTIONS,
  WHT_RATE_OPTIONS,
} from '@/lib/petty-cash/utils';

interface ExpenseLineItemEditorProps {
  lineItems: PettyCashExpenseLineItem[];
  onChange: (items: PettyCashExpenseLineItem[]) => void;
  projects: Project[];
  categories: ExpenseCategory[];
  readOnly?: boolean;
  errors?: string[];
}

export default function ExpenseLineItemEditor({
  lineItems,
  onChange,
  projects,
  categories,
  readOnly = false,
  errors = [],
}: ExpenseLineItemEditorProps) {
  const handleAddLine = () => {
    onChange([...lineItems, createEmptyLineItem()]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length <= 1) return;
    const newItems = lineItems.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleFieldChange = (
    index: number,
    field: keyof PettyCashExpenseLineItem,
    value: string | number | boolean
  ) => {
    const newItems = [...lineItems];
    const item = { ...newItems[index] };

    // Handle special fields
    if (field === 'projectId') {
      const project = projects.find((p) => p.id === value);
      item.projectId = value as string;
      item.projectName = project?.name || '';
    } else if (field === 'categoryId') {
      const category = categories.find((c) => c.id === value);
      item.categoryId = value as string;
      item.categoryName = category?.name || '';
    } else if (field === 'amount' || field === 'vatRate') {
      (item as Record<string, unknown>)[field] = Number(value) || 0;
    } else if (field === 'vatType') {
      item.vatType = value as VatType;
    } else if (field === 'whtRate') {
      item.whtRate = value === 'custom' ? 'custom' : (Number(value) as WhtRate);
    } else if (field === 'whtApplicable') {
      item.whtApplicable = value as boolean;
      if (!value) {
        item.whtRate = 0;
        item.whtAmount = 0;
      }
    } else {
      (item as Record<string, unknown>)[field] = value;
    }

    // Recalculate amounts
    const calculated = calculateLineItemAmounts(
      item.amount,
      item.vatType,
      item.vatRate,
      item.whtApplicable,
      item.whtRate
    );
    item.preVatAmount = calculated.preVatAmount;
    item.vatAmount = calculated.vatAmount;
    item.whtAmount = calculated.whtAmount;

    newItems[index] = item;
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Expense Items</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#5A7A8F] bg-[#5A7A8F]/10 rounded-lg hover:bg-[#5A7A8F]/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <ul className="text-sm text-red-700 list-disc list-inside">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Line Items Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Project *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                Category *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Amount *
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                VAT Type
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                VAT %
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                WHT
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                VAT Amt
              </th>
              {!readOnly && (
                <th className="px-3 py-3 w-10"></th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lineItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {/* Project */}
                <td className="px-3 py-2">
                  <select
                    value={item.projectId}
                    onChange={(e) =>
                      handleFieldChange(index, 'projectId', e.target.value)
                    }
                    disabled={readOnly}
                    className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 ${
                      !item.projectId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} - {project.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Category */}
                <td className="px-3 py-2">
                  <select
                    value={item.categoryId}
                    onChange={(e) =>
                      handleFieldChange(index, 'categoryId', e.target.value)
                    }
                    disabled={readOnly}
                    className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 ${
                      !item.categoryId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Description */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      handleFieldChange(index, 'description', e.target.value)
                    }
                    disabled={readOnly}
                    placeholder="Item description"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
                  />
                </td>

                {/* Amount */}
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={(e) =>
                      handleFieldChange(index, 'amount', e.target.value)
                    }
                    disabled={readOnly}
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
                  />
                </td>

                {/* VAT Type */}
                <td className="px-3 py-2">
                  <select
                    value={item.vatType}
                    onChange={(e) =>
                      handleFieldChange(index, 'vatType', e.target.value)
                    }
                    disabled={readOnly}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
                  >
                    {VAT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* VAT Rate */}
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.vatRate}
                    onChange={(e) =>
                      handleFieldChange(index, 'vatRate', e.target.value)
                    }
                    disabled={readOnly || item.vatType === 'no_vat'}
                    min="0"
                    max="100"
                    className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
                  />
                </td>

                {/* WHT Toggle */}
                <td className="px-3 py-2 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.whtApplicable}
                      onChange={(e) =>
                        handleFieldChange(index, 'whtApplicable', e.target.checked)
                      }
                      disabled={readOnly}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#5A7A8F]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A7A8F]"></div>
                  </label>
                </td>

                {/* VAT Amount */}
                <td className="px-3 py-2 text-right text-sm text-gray-600">
                  {formatNumber(item.vatAmount)}
                </td>

                {/* Delete */}
                {!readOnly && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(index)}
                      disabled={lineItems.length <= 1}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WHT Rate Selection Row (shown for items with WHT enabled) */}
      {lineItems.some((item) => item.whtApplicable) && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 mb-3">
            Withholding Tax Rates
          </h5>
          <div className="space-y-2">
            {lineItems.map(
              (item, index) =>
                item.whtApplicable && (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 text-sm"
                  >
                    <span className="w-48 text-gray-600 truncate">
                      {item.description || `Item ${index + 1}`}
                    </span>
                    <select
                      value={item.whtRate}
                      onChange={(e) =>
                        handleFieldChange(index, 'whtRate', e.target.value)
                      }
                      disabled={readOnly}
                      className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                    >
                      {WHT_RATE_OPTIONS.map((opt) => (
                        <option key={String(opt.value)} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-500">
                      WHT: {formatNumber(item.whtAmount)}
                    </span>
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
