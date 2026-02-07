'use client';

import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CurrencySelect({
  value,
  onChange,
  disabled,
  className,
}: CurrencySelectProps) {
  const { options, loading } = useCurrencyOptions();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className={
        className ||
        'w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed'
      }
    >
      {loading ? (
        <option>Loading...</option>
      ) : (
        options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))
      )}
    </select>
  );
}
