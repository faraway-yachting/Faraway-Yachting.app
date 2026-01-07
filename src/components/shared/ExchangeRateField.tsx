"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle, Edit2, Check, X } from "lucide-react";
import { Currency } from "@/data/company/types";
import { FxRateSource } from "@/data/exchangeRate/types";

interface ExchangeRateFieldProps {
  currency: Currency;
  date: string;
  rate: number | null;
  source: FxRateSource | null;
  isLoading: boolean;
  error: string | null;
  isManualOverride: boolean;
  onFetchRate: () => void;
  onManualRate: (rate: number) => void;
  disabled?: boolean;
}

export function ExchangeRateField({
  currency,
  date,
  rate,
  source,
  isLoading,
  error,
  isManualOverride,
  onFetchRate,
  onManualRate,
  disabled = false,
}: ExchangeRateFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  // Don't show for THB
  if (currency === "THB") {
    return null;
  }

  const handleEditStart = () => {
    setEditValue(rate?.toFixed(4) || "");
    setIsEditing(true);
  };

  const handleEditSave = () => {
    const parsedRate = parseFloat(editValue);
    if (!isNaN(parsedRate) && parsedRate > 0) {
      onManualRate(parsedRate);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Exchange Rate ({currency} → THB)
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={onFetchRate}
            disabled={isLoading}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Fetching..." : "Fetch Rate"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              step="0.0001"
              min="0"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter rate"
              autoFocus
            />
            <button
              type="button"
              onClick={handleEditSave}
              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleEditCancel}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
              {isLoading ? (
                <span className="text-gray-400">Fetching rate...</span>
              ) : rate ? (
                <span className="font-mono">
                  1 {currency} = {rate.toFixed(4)} THB
                </span>
              ) : (
                <span className="text-gray-400">No rate set</span>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleEditStart}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                title="Enter rate manually"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Source indicator */}
      {rate && source && !isEditing && (
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 ${
              source === "api"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {source === "api" ? "API Rate" : "Manual Entry"}
          </span>
          <span className="text-gray-500">for {date}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}

      {/* THB equivalent display when rate is available */}
      {rate && (
        <p className="text-xs text-gray-500">
          Rate will be locked when document is saved for audit trail.
        </p>
      )}
    </div>
  );
}
