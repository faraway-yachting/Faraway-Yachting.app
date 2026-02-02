"use client";

import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Fragment, useState } from "react";
import { PLCategory, PLLineItem, formatAmount, formatTHB } from "@/lib/reports/plCalculation";

interface PLReportTableProps {
  title: string;
  categories: PLCategory[];
  showInTHB: boolean;
  type: "income" | "expense";
}

export function PLReportTable({
  title,
  categories,
  showInTHB,
  type,
}: PLReportTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (code: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCategories(newExpanded);
  };

  const headerColor = type === "income" ? "bg-green-50" : "bg-red-50";
  const headerTextColor = type === "income" ? "text-green-800" : "text-red-800";

  const totalAmount = categories.reduce(
    (sum, cat) => sum + (showInTHB ? cat.thbTotal : cat.originalTotal),
    0
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className={`${headerColor} px-4 py-3 border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${headerTextColor}`}>{title}</h3>
          <span className={`text-lg font-bold ${headerTextColor}`}>
            {showInTHB ? formatTHB(totalAmount) : `${totalAmount.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {type === "income" ? "Client" : "Vendor"}
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            {!showInTHB && (
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Currency
              </th>
            )}
            {!showInTHB && (
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Original
              </th>
            )}
            {showInTHB && (
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                FX Rate
              </th>
            )}
            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {showInTHB ? "THB Amount" : "Amount"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {categories.map((category) => (
            <Fragment key={category.code}>
              {/* Category Header */}
              <tr
                className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleCategory(category.code)}
              >
                <td colSpan={showInTHB ? 5 : 6} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(category.code) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-700">
                      {category.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({category.items.length} items)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-700">
                  {showInTHB
                    ? formatTHB(category.thbTotal)
                    : category.originalTotal.toLocaleString()}
                </td>
              </tr>

              {/* Category Items */}
              {expandedCategories.has(category.code) &&
                category.items.map((item, index) => (
                  <tr key={`${item.id}-${item.documentNumber}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                          {item.documentNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.clientOrVendor}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.projectName || "-"}
                    </td>
                    {!showInTHB && (
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {item.currency}
                      </td>
                    )}
                    {!showInTHB && (
                      <td className="px-4 py-2 text-sm text-gray-600 text-right">
                        {formatAmount(item.originalAmount, item.currency)}
                      </td>
                    )}
                    {showInTHB && (
                      <td className="px-4 py-2 text-sm text-gray-600 text-right">
                        {item.fxRate?.toFixed(4) || "1.0000"}
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                      {showInTHB
                        ? formatTHB(item.thbAmount)
                        : formatAmount(item.originalAmount, item.currency)}
                    </td>
                  </tr>
                ))}
            </Fragment>
          ))}

          {/* Empty State */}
          {categories.length === 0 && (
            <tr>
              <td
                colSpan={showInTHB ? 6 : 7}
                className="px-4 py-8 text-center text-gray-500"
              >
                No {type} records found for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
