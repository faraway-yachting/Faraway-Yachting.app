/**
 * Exchange Rate Service
 *
 * Client-side service for fetching and managing exchange rates.
 * Uses Bank of Thailand (BOT) as primary source with Frankfurt fallback.
 * Rates are cached to minimize API calls.
 */

import { Currency } from '@/data/company/types';
import { FxRateSource, FetchRateResult } from '@/data/exchangeRate/types';
import {
  getFromCache,
  saveToCache,
  hasInCache,
  getRecordFromCache,
} from '@/data/exchangeRate/cache';

/**
 * Get exchange rate for a currency on a specific date
 * Returns cached rate if available, otherwise fetches from API
 *
 * @param currency - The source currency (e.g., 'USD', 'EUR')
 * @param date - The date in ISO format (YYYY-MM-DD)
 * @returns The exchange rate to THB with source information
 */
export async function getExchangeRate(
  currency: Currency,
  date: string
): Promise<FetchRateResult> {
  // THB to THB is always 1
  if (currency === 'THB') {
    return {
      success: true,
      rate: 1,
      source: 'manual' as FxRateSource,
      date: date,
      baseCurrency: 'THB',
      targetCurrency: 'THB',
    };
  }

  // Check cache first
  const cachedRate = getFromCache(currency, date);
  if (cachedRate !== undefined) {
    const record = getRecordFromCache(currency, date);
    return {
      success: true,
      rate: cachedRate,
      source: record?.source || 'bot',
      date: record?.date || date,
      baseCurrency: currency,
      targetCurrency: 'THB',
    };
  }

  // Fetch from API (BOT primary, Frankfurt fallback)
  try {
    const response = await fetch(
      `/api/exchange-rate?currency=${currency}&date=${date}`
    );

    const data = await response.json();

    if (data.success && data.rate) {
      // Map API source to FxRateSource ('bot' or 'fallback')
      const source: FxRateSource = data.source === 'fallback' ? 'fallback' : 'bot';

      // Cache the result with the actual source
      saveToCache(currency, data.date || date, data.rate, source);

      return {
        success: true,
        rate: data.rate,
        source: source,
        date: data.date || date,
        baseCurrency: data.baseCurrency || currency,
        targetCurrency: data.targetCurrency || 'THB',
      };
    }

    return {
      success: false,
      error: data.error || 'Failed to fetch exchange rate',
    };
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return {
      success: false,
      error: 'Network error fetching exchange rate',
    };
  }
}

/**
 * Convert an amount to THB using the provided exchange rate
 *
 * @param amount - The amount in the original currency
 * @param rate - The exchange rate to THB
 * @returns The amount in THB (rounded to 2 decimal places)
 */
export function convertToTHB(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Check if we have a cached rate for a currency/date
 */
export function hasCachedRate(currency: Currency, date: string): boolean {
  if (currency === 'THB') return true;
  return hasInCache(currency, date);
}

/**
 * Manually set an exchange rate (for user override)
 */
export function setManualRate(
  currency: Currency,
  date: string,
  rate: number
): void {
  if (currency === 'THB') return;
  saveToCache(currency, date, rate, 'manual');
}

/**
 * Get today's date in ISO format
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate all THB amounts for an income document
 */
export function calculateThbIncomeAmounts(
  subtotal: number,
  taxAmount: number,
  totalAmount: number,
  fxRate: number
): {
  thbSubtotal: number;
  thbTaxAmount: number;
  thbTotalAmount: number;
} {
  return {
    thbSubtotal: convertToTHB(subtotal, fxRate),
    thbTaxAmount: convertToTHB(taxAmount, fxRate),
    thbTotalAmount: convertToTHB(totalAmount, fxRate),
  };
}

/**
 * Calculate all THB amounts for an expense document
 */
export function calculateThbExpenseAmounts(
  subtotal: number,
  vatAmount: number,
  whtAmount: number,
  netPayable: number,
  totalAmount: number,
  fxRate: number
): {
  thbSubtotal: number;
  thbVatAmount: number;
  thbWhtAmount: number;
  thbNetPayable: number;
  thbTotalAmount: number;
} {
  return {
    thbSubtotal: convertToTHB(subtotal, fxRate),
    thbVatAmount: convertToTHB(vatAmount, fxRate),
    thbWhtAmount: convertToTHB(whtAmount, fxRate),
    thbNetPayable: convertToTHB(netPayable, fxRate),
    thbTotalAmount: convertToTHB(totalAmount, fxRate),
  };
}

/**
 * Calculate THB amount for a payment
 */
export function calculateThbPaymentAmount(
  amount: number,
  fxRate: number
): number {
  return convertToTHB(amount, fxRate);
}
