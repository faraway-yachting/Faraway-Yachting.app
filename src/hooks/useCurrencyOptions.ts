'use client';

import { useState, useEffect } from 'react';
import { bookingLookupsApi } from '@/lib/supabase/api/bookingLookups';
import type { BookingLookup } from '@/lib/supabase/api/bookingLookups';

export interface CurrencyOption {
  value: string;
  label: string;
}

export function useCurrencyOptions() {
  const [options, setOptions] = useState<CurrencyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    bookingLookupsApi
      .getByCategory('currency')
      .then((data: BookingLookup[]) => {
        if (mounted) {
          setOptions(data.map((d) => ({ value: d.value, label: d.label })));
        }
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { options, loading };
}
