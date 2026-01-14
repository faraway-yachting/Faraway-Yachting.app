/**
 * Exchange Rate Types
 *
 * Types for managing exchange rates and currency conversion to THB.
 */

import { Currency } from '@/data/company/types';

/**
 * Source of the exchange rate
 * - 'bot': Bank of Thailand (primary source)
 * - 'fallback': Frankfurt API (when BOT unavailable)
 * - 'manual': User-entered rate
 * - 'api': Legacy value (treat as 'fallback')
 */
export type FxRateSource = 'bot' | 'fallback' | 'manual' | 'api';

/**
 * Exchange rate record for caching
 */
export interface ExchangeRateRecord {
  fromCurrency: Currency;
  toCurrency: 'THB';
  rate: number;
  date: string; // ISO date (YYYY-MM-DD)
  source: FxRateSource;
  fetchedAt: string; // ISO timestamp
}

/**
 * Exchange rate cache structure
 * Key format: "CURRENCY-YYYY-MM-DD" (e.g., "USD-2024-01-15")
 */
export interface ExchangeRateCache {
  [key: string]: ExchangeRateRecord;
}

/**
 * API response from exchangerate.host
 */
export interface ExchangeRateAPIResponse {
  success: boolean;
  base: string;
  date: string;
  rates: {
    THB?: number;
    [key: string]: number | undefined;
  };
}

/**
 * Result from fetching exchange rate
 */
export interface FetchRateResult {
  success: boolean;
  rate?: number;
  source?: FxRateSource;
  date?: string;           // Actual date the rate is from
  baseCurrency?: string;   // Source currency (e.g., 'USD')
  targetCurrency?: string; // Target currency (always 'THB')
  error?: string;
}

/**
 * Common FX fields to add to money types
 */
export interface FxFields {
  fxRate?: number;             // Exchange rate to THB at transaction time
  fxRateSource?: FxRateSource; // Where the rate came from
  fxBaseCurrency?: string;     // Source currency (e.g., 'USD')
  fxTargetCurrency?: string;   // Target currency (always 'THB')
  fxRateDate?: string;         // Actual date the rate is from (may differ from transaction date)
}

/**
 * THB converted amount fields for Income types
 */
export interface ThbIncomeFields extends FxFields {
  thbSubtotal?: number;      // subtotal × fxRate
  thbTaxAmount?: number;     // taxAmount × fxRate
  thbTotalAmount?: number;   // totalAmount × fxRate
}

/**
 * THB converted amount fields for Expense types
 */
export interface ThbExpenseFields extends FxFields {
  thbSubtotal?: number;      // subtotal × fxRate
  thbVatAmount?: number;     // vatAmount × fxRate
  thbWhtAmount?: number;     // whtAmount × fxRate
  thbNetPayable?: number;    // netPayable × fxRate
  thbTotalAmount?: number;   // totalAmount × fxRate
}

/**
 * THB converted amount fields for Payment types
 */
export interface ThbPaymentFields {
  fxRate?: number;
  thbAmount?: number;        // payment amount × fxRate
}
