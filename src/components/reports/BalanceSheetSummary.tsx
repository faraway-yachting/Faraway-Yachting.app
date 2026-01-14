"use client";

import { CheckCircle, AlertTriangle } from "lucide-react";

interface BalanceSheetSummaryProps {
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  difference: number;
  showInTHB: boolean;
}

export function BalanceSheetSummary({
  totalAssets,
  totalLiabilitiesAndEquity,
  isBalanced,
  difference,
  showInTHB,
}: BalanceSheetSummaryProps) {
  const formatValue = (value: number) => {
    const formatted = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showInTHB ? `฿${formatted}` : formatted;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Assets */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Assets</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {formatValue(totalAssets)}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">A</span>
          </div>
        </div>
      </div>

      {/* Total Liabilities + Equity */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Liabilities + Equity
            </p>
            <p className="mt-1 text-2xl font-semibold text-purple-600">
              {formatValue(totalLiabilitiesAndEquity)}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
            <span className="text-purple-600 font-bold text-lg">L+E</span>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <div
        className={`rounded-lg border p-4 shadow-sm ${
          isBalanced
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`text-sm font-medium ${
                isBalanced ? "text-green-700" : "text-amber-700"
              }`}
            >
              Balance Status
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${
                isBalanced ? "text-green-800" : "text-amber-800"
              }`}
            >
              {isBalanced ? "Balanced" : `Difference: ${formatValue(difference)}`}
            </p>
          </div>
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isBalanced ? "bg-green-100" : "bg-amber-100"
            }`}
          >
            {isBalanced ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
