/**
 * Exchange Rate Cache
 *
 * Caches exchange rates to avoid repeated API calls.
 * Uses in-memory cache with localStorage persistence.
 */

import { Currency } from '@/data/company/types';
import { ExchangeRateRecord, ExchangeRateCache, FxRateSource } from './types';

const CACHE_KEY = 'faraway_fx_rates';

// In-memory cache
let memoryCache: ExchangeRateCache = {};

/**
 * Generate cache key for a currency and date
 */
function getCacheKey(currency: Currency, date: string): string {
  return `${currency}-${date}`;
}

/**
 * Load cache from localStorage (browser only)
 */
function loadFromStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      memoryCache = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load exchange rate cache from localStorage:', error);
    memoryCache = {};
  }
}

/**
 * Save cache to localStorage (browser only)
 */
function saveToStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch (error) {
    console.warn('Failed to save exchange rate cache to localStorage:', error);
  }
}

/**
 * Initialize cache from storage
 */
export function initializeCache(): void {
  loadFromStorage();
}

/**
 * Get exchange rate from cache
 * @returns The cached rate or undefined if not found
 */
export function getFromCache(currency: Currency, date: string): number | undefined {
  // THB to THB is always 1
  if (currency === 'THB') return 1;

  const key = getCacheKey(currency, date);
  const record = memoryCache[key];

  if (record) {
    return record.rate;
  }

  return undefined;
}

/**
 * Get full exchange rate record from cache
 */
export function getRecordFromCache(currency: Currency, date: string): ExchangeRateRecord | undefined {
  if (currency === 'THB') {
    return {
      fromCurrency: 'THB',
      toCurrency: 'THB',
      rate: 1,
      date,
      source: 'manual',
      fetchedAt: new Date().toISOString(),
    };
  }

  const key = getCacheKey(currency, date);
  return memoryCache[key];
}

/**
 * Save exchange rate to cache
 */
export function saveToCache(
  currency: Currency,
  date: string,
  rate: number,
  source: FxRateSource = 'api'
): void {
  // Don't cache THB
  if (currency === 'THB') return;

  const key = getCacheKey(currency, date);
  const record: ExchangeRateRecord = {
    fromCurrency: currency,
    toCurrency: 'THB',
    rate,
    date,
    source,
    fetchedAt: new Date().toISOString(),
  };

  memoryCache[key] = record;
  saveToStorage();
}

/**
 * Check if a rate exists in cache
 */
export function hasInCache(currency: Currency, date: string): boolean {
  if (currency === 'THB') return true;
  const key = getCacheKey(currency, date);
  return key in memoryCache;
}

/**
 * Clear all cached rates
 */
export function clearCache(): void {
  memoryCache = {};
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
  }
}

/**
 * Get all cached rates
 */
export function getAllCachedRates(): ExchangeRateCache {
  return { ...memoryCache };
}

/**
 * Get cached rates for a specific date
 */
export function getCachedRatesForDate(date: string): Record<Currency, number> {
  const rates: Partial<Record<Currency, number>> = { THB: 1 };

  for (const [key, record] of Object.entries(memoryCache)) {
    if (key.endsWith(`-${date}`)) {
      rates[record.fromCurrency] = record.rate;
    }
  }

  return rates as Record<Currency, number>;
}

// Initialize cache on module load (browser only)
if (typeof window !== 'undefined') {
  initializeCache();
}
