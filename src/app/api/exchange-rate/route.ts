/**
 * Exchange Rate API Route
 *
 * Fetches exchange rates from exchangerate.host (free, no API key required)
 * Endpoint: GET /api/exchange-rate?currency=USD&date=2024-01-15
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD', 'AED'] as const;

interface ExchangeRateResponse {
  success: boolean;
  rate?: number;
  source?: 'api' | 'manual';
  date?: string;
  error?: string;
}

/**
 * Fetch exchange rate from exchangerate.host
 * Free API, no key required
 */
async function fetchFromExchangeRateHost(
  currency: string,
  date: string
): Promise<{ rate: number | null; error?: string }> {
  try {
    // exchangerate.host format: https://api.exchangerate.host/2024-01-15?base=USD&symbols=THB
    const url = `https://api.exchangerate.host/${date}?base=${currency}&symbols=THB`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      // Cache for 1 hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { rate: null, error: `API returned ${response.status}` };
    }

    const data = await response.json();

    if (!data.success || !data.rates?.THB) {
      return { rate: null, error: 'Rate not available from API' };
    }

    return { rate: data.rates.THB };
  } catch (error) {
    console.error('exchangerate.host fetch error:', error);
    return { rate: null, error: 'Failed to fetch from exchangerate.host' };
  }
}

/**
 * Fallback: Fetch from frankfurter.app (another free API)
 */
async function fetchFromFrankfurter(
  currency: string,
  date: string
): Promise<{ rate: number | null; error?: string }> {
  try {
    // frankfurter.app format: https://api.frankfurter.app/2024-01-15?from=USD&to=THB
    const url = `https://api.frankfurter.app/${date}?from=${currency}&to=THB`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { rate: null, error: `Frankfurter API returned ${response.status}` };
    }

    const data = await response.json();

    if (!data.rates?.THB) {
      return { rate: null, error: 'Rate not available from Frankfurter' };
    }

    return { rate: data.rates.THB };
  } catch (error) {
    console.error('Frankfurter fetch error:', error);
    return { rate: null, error: 'Failed to fetch from Frankfurter' };
  }
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
      source: 'api',
      date: date || new Date().toISOString().split('T')[0],
    });
  }

  if (!SUPPORTED_CURRENCIES.includes(currency as typeof SUPPORTED_CURRENCIES[number])) {
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

  if (requestDate > today) {
    // For future dates, use today's rate with a warning
    const todayStr = today.toISOString().split('T')[0];
    const result = await fetchFromExchangeRateHost(currency, todayStr);

    if (result.rate !== null) {
      return NextResponse.json({
        success: true,
        rate: result.rate,
        source: 'api',
        date: todayStr,
        // Note: Using today's rate for future date
      });
    }
  }

  // Try primary API (exchangerate.host)
  let result = await fetchFromExchangeRateHost(currency, date);

  // If primary fails, try fallback (frankfurter.app)
  if (result.rate === null) {
    console.log('Primary API failed, trying Frankfurter fallback');
    result = await fetchFromFrankfurter(currency, date);
  }

  // If both fail, try previous business day (for weekends/holidays)
  if (result.rate === null) {
    const prevDate = getPreviousBusinessDay(date);
    console.log(`Rate not available for ${date}, trying ${prevDate}`);

    result = await fetchFromExchangeRateHost(currency, prevDate);
    if (result.rate === null) {
      result = await fetchFromFrankfurter(currency, prevDate);
    }

    if (result.rate !== null) {
      return NextResponse.json({
        success: true,
        rate: result.rate,
        source: 'api',
        date: prevDate,
      });
    }
  }

  if (result.rate !== null) {
    return NextResponse.json({
      success: true,
      rate: result.rate,
      source: 'api',
      date,
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

/**
 * Get previous business day (skip weekends)
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
