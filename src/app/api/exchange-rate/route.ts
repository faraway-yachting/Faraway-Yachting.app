/**
 * Exchange Rate API Route
 *
 * Fetches exchange rates from Bank of Thailand (BOT) as primary source.
 * Falls back to Frankfurt API if BOT is unavailable.
 * Uses Weighted-average Interbank Exchange Rate (daily average).
 *
 * Endpoint: GET /api/exchange-rate?currency=USD&date=2024-01-15
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD', 'AED', 'JPY', 'CNY', 'AUD'] as const;

// BOT API uses ISO currency codes
const BOT_CURRENCY_CODES: Record<string, string> = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  SGD: 'SGD',
  AED: 'AED',
  JPY: 'JPY',
  CNY: 'CNY',
  AUD: 'AUD',
};

interface ExchangeRateResponse {
  success: boolean;
  rate?: number;
  source?: 'bot' | 'fallback' | 'manual';
  date?: string;
  baseCurrency?: string;
  targetCurrency?: string;
  error?: string;
}

interface BOTDataDetail {
  period: string;
  currency_id: string;
  currency_name_th: string;
  currency_name_eng: string;
  buying_sight: string;
  buying_transfer: string;
  selling: string;
  mid_rate: string;
}

interface BOTAPIResponse {
  result: {
    timestamp: string;
    api: string;
    data: {
      data_header: {
        report_name_eng: string;
        report_name_th: string;
        report_uoq_name_eng: string;
        report_uoq_name_th: string;
        report_source_of_data: string[];
        report_remark: string[];
        last_updated: string;
      };
      data_detail: BOTDataDetail[];
    };
  };
}

/**
 * Fetch exchange rate from Bank of Thailand API
 * Returns the mid_rate (weighted-average interbank rate)
 */
async function fetchFromBOT(
  currency: string,
  date: string
): Promise<{ rate: number | null; actualDate?: string; error?: string }> {
  const clientId = process.env.BOT_API_CLIENT_ID;

  if (!clientId) {
    // BOT API not configured, return null to trigger fallback
    return { rate: null, error: 'BOT API not configured' };
  }

  try {
    const botCurrency = BOT_CURRENCY_CODES[currency];
    if (!botCurrency) {
      return { rate: null, error: `Currency ${currency} not supported by BOT API` };
    }

    // BOT API requires start_period and end_period
    const url = `https://apigw1.bot.or.th/bot/public/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${date}&end_period=${date}`;

    const response = await fetch(url, {
      headers: {
        'x-ibm-client-id': clientId,
        'accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { rate: null, error: 'BOT API authentication failed' };
      }
      if (response.status === 429) {
        return { rate: null, error: 'BOT API rate limit exceeded' };
      }
      return { rate: null, error: `BOT API returned ${response.status}` };
    }

    const data: BOTAPIResponse = await response.json();

    if (!data.result?.data?.data_detail?.length) {
      // No data for this date (weekend/holiday)
      return { rate: null, error: 'No rate available for this date' };
    }

    // Find the rate for the requested currency
    const currencyData = data.result.data.data_detail.find(
      (d) => d.currency_id === botCurrency
    );

    if (!currencyData) {
      return { rate: null, error: `Rate for ${currency} not found` };
    }

    // Use mid_rate (weighted-average interbank rate)
    // This is the rate we want for accounting purposes
    const midRate = parseFloat(currencyData.mid_rate);

    if (isNaN(midRate) || midRate <= 0) {
      return { rate: null, error: 'Invalid rate value from BOT API' };
    }

    return {
      rate: midRate,
      actualDate: currencyData.period,
    };
  } catch (error) {
    console.error('BOT API fetch error:', error);
    return { rate: null, error: 'Failed to fetch from Bank of Thailand' };
  }
}

/**
 * Fallback: Fetch from frankfurter.app (free API, no key required)
 */
async function fetchFromFrankfurt(
  currency: string,
  date: string
): Promise<{ rate: number | null; actualDate?: string; error?: string }> {
  try {
    const url = `https://api.frankfurter.app/${date}?from=${currency}&to=THB`;

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { rate: null, error: `Frankfurt API returned ${response.status}` };
    }

    const data = await response.json();

    if (!data.rates?.THB) {
      return { rate: null, error: 'Rate not available from Frankfurt' };
    }

    return {
      rate: data.rates.THB,
      actualDate: data.date,
    };
  } catch (error) {
    console.error('Frankfurt API fetch error:', error);
    return { rate: null, error: 'Failed to fetch from Frankfurt' };
  }
}

/**
 * Get previous business day (skip weekends)
 * BOT does not publish rates on weekends
 */
function getPreviousBusinessDay(dateStr: string): string {
  const date = new Date(dateStr);
  let daysToSubtract = 1;

  // If Monday, go back to Friday
  if (date.getDay() === 1) {
    daysToSubtract = 3;
  }
  // If Sunday, go back to Friday
  else if (date.getDay() === 0) {
    daysToSubtract = 2;
  }

  date.setDate(date.getDate() - daysToSubtract);
  return date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest): Promise<NextResponse<ExchangeRateResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const currency = searchParams.get('currency')?.toUpperCase();
  const date = searchParams.get('date'); // Format: YYYY-MM-DD

  // Validate currency
  if (!currency) {
    return NextResponse.json(
      { success: false, error: 'Currency parameter is required' },
      { status: 400 }
    );
  }

  // THB to THB is always 1
  if (currency === 'THB') {
    return NextResponse.json({
      success: true,
      rate: 1,
      source: 'bot',
      date: date || new Date().toISOString().split('T')[0],
      baseCurrency: 'THB',
      targetCurrency: 'THB',
    });
  }

  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Validate date
  if (!date) {
    return NextResponse.json(
      { success: false, error: 'Date parameter is required (format: YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Check if date is in the future
  const requestDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let targetDate = date;

  if (requestDate > today) {
    // For future dates, use today's rate
    targetDate = today.toISOString().split('T')[0];
  }

  // Try fetching from BOT (primary source)
  let result = await fetchFromBOT(currency, targetDate);
  let source: 'bot' | 'fallback' = 'bot';

  // If BOT fails, try previous business days
  let attempts = 0;
  let fallbackDate = targetDate;

  while (result.rate === null && attempts < 3) {
    fallbackDate = getPreviousBusinessDay(fallbackDate);
    console.log(`No BOT rate for ${targetDate}, trying ${fallbackDate}`);
    result = await fetchFromBOT(currency, fallbackDate);
    attempts++;
  }

  // If BOT still fails, try Frankfurt as fallback
  if (result.rate === null) {
    console.log('BOT API unavailable, trying Frankfurt fallback');
    source = 'fallback';
    fallbackDate = targetDate;
    result = await fetchFromFrankfurt(currency, fallbackDate);

    // Try previous business days with Frankfurt too
    attempts = 0;
    while (result.rate === null && attempts < 3) {
      fallbackDate = getPreviousBusinessDay(fallbackDate);
      result = await fetchFromFrankfurt(currency, fallbackDate);
      attempts++;
    }
  }

  if (result.rate !== null) {
    return NextResponse.json({
      success: true,
      rate: result.rate,
      source,
      date: result.actualDate || fallbackDate,
      baseCurrency: currency,
      targetCurrency: 'THB',
    });
  }

  // All attempts failed
  return NextResponse.json(
    {
      success: false,
      error: result.error || 'Unable to fetch exchange rate. Please enter manually.',
    },
    { status: 503 }
  );
}
