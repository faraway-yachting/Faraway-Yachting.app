'use client';

import { ArrowDownLeft, ArrowUpRight, Calculator } from 'lucide-react';

interface VatSummaryCardsProps {
  vatInput: number;
  vatOutput: number;
  netVat: number;
  currency?: string;
}

export function VatSummaryCards({
  vatInput,
  vatOutput,
  netVat,
  currency = '฿',
}: VatSummaryCardsProps) {
  const isPayable = netVat > 0;
  const isRefundable = netVat < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* VAT Input */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ArrowDownLeft className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">VAT Input</h3>
            <p className="text-xs text-gray-400">From purchases</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {currency}{vatInput.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-1">Claimable from Revenue Dept.</p>
      </div>

      {/* VAT Output */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <ArrowUpRight className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">VAT Output</h3>
            <p className="text-xs text-gray-400">From sales</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {currency}{vatOutput.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-1">Collected from customers</p>
      </div>

      {/* Net VAT */}
      <div
        className={`rounded-lg border p-5 ${
          isPayable
            ? 'bg-red-50 border-red-200'
            : isRefundable
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2 rounded-lg ${
              isPayable
                ? 'bg-red-100'
                : isRefundable
                ? 'bg-green-100'
                : 'bg-gray-100'
            }`}
          >
            <Calculator
              className={`h-5 w-5 ${
                isPayable
                  ? 'text-red-600'
                  : isRefundable
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Net VAT</h3>
            <p className="text-xs text-gray-400">Output - Input</p>
          </div>
        </div>
        <p
          className={`text-2xl font-bold ${
            isPayable
              ? 'text-red-600'
              : isRefundable
              ? 'text-green-600'
              : 'text-gray-900'
          }`}
        >
          {isRefundable && '-'}
          {currency}{Math.abs(netVat).toLocaleString()}
        </p>
        <p
          className={`text-xs mt-1 font-medium ${
            isPayable
              ? 'text-red-600'
              : isRefundable
              ? 'text-green-600'
              : 'text-gray-500'
          }`}
        >
          {isPayable
            ? 'PAYABLE to Revenue Dept.'
            : isRefundable
            ? 'REFUNDABLE from Revenue Dept.'
            : 'Zero balance'}
        </p>
      </div>
    </div>
  );
}
