"use client";

import { useState, useCallback } from "react";
import { Currency } from "@/data/company/types";
import { FxRateSource } from "@/data/exchangeRate/types";
import { getExchangeRate, getTodayISO } from "@/lib/exchangeRate/service";

export interface ExchangeRateState {
  rate: number | null;
  source: FxRateSource | null;
  isLoading: boolean;
  error: string | null;
  isManualOverride: boolean;
}

export interface UseExchangeRateResult {
  state: ExchangeRateState;
  fetchRate: (currency: Currency, date?: string) => Promise<number | null>;
  setManualRate: (rate: number) => void;
  clearRate: () => void;
}

/**
 * Hook for managing exchange rate fetching and manual override in forms
 */
export function useExchangeRate(): UseExchangeRateResult {
  const [state, setState] = useState<ExchangeRateState>({
    rate: null,
    source: null,
    isLoading: false,
    error: null,
    isManualOverride: false,
  });

  const fetchRate = useCallback(async (currency: Currency, date?: string): Promise<number | null> => {
    // THB doesn't need conversion
    if (currency === "THB") {
      setState({
        rate: 1,
        source: "manual",
        isLoading: false,
        error: null,
        isManualOverride: false,
      });
      return 1;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    const rateDate = date || getTodayISO();
    const result = await getExchangeRate(currency, rateDate);

    if (result.success && result.rate) {
      setState({
        rate: result.rate,
        source: result.source || "api",
        isLoading: false,
        error: null,
        isManualOverride: false,
      });
      return result.rate;
    } else {
      setState({
        rate: null,
        source: null,
        isLoading: false,
        error: result.error || "Failed to fetch exchange rate",
        isManualOverride: false,
      });
      return null;
    }
  }, []);

  const setManualRate = useCallback((rate: number) => {
    setState({
      rate,
      source: "manual",
      isLoading: false,
      error: null,
      isManualOverride: true,
    });
  }, []);

  const clearRate = useCallback(() => {
    setState({
      rate: null,
      source: null,
      isLoading: false,
      error: null,
      isManualOverride: false,
    });
  }, []);

  return {
    state,
    fetchRate,
    setManualRate,
    clearRate,
  };
}
