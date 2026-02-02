'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReceiptForm from '@/components/income/ReceiptForm';

function NewReceiptContent() {
  const searchParams = useSearchParams();
  const fromInvoiceId = searchParams.get('from');

  // Charter prefill from booking form (opened via new tab)
  const charterPrefill = searchParams.get('boatId') || searchParams.get('charterType') || searchParams.get('bookingId')
    ? {
        boatId: searchParams.get('boatId') || undefined,
        charterType: searchParams.get('charterType') || undefined,
        charterDateFrom: searchParams.get('charterDateFrom') || undefined,
        charterDateTo: searchParams.get('charterDateTo') || undefined,
        charterTime: searchParams.get('charterTime') || undefined,
        customerName: searchParams.get('customerName') || undefined,
        currency: searchParams.get('currency') || undefined,
        totalPrice: searchParams.get('totalPrice') ? parseFloat(searchParams.get('totalPrice')!) : undefined,
        bookingId: searchParams.get('bookingId') || undefined,
      }
    : undefined;

  return (
    <div className="p-6">
      <ReceiptForm
        invoiceId={fromInvoiceId || undefined}
        charterPrefill={charterPrefill}
      />
    </div>
  );
}

export default function NewReceiptPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <NewReceiptContent />
    </Suspense>
  );
}
