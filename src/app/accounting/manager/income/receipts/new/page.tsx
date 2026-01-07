'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReceiptForm from '@/components/income/ReceiptForm';

function NewReceiptContent() {
  const searchParams = useSearchParams();
  const fromInvoiceId = searchParams.get('from');

  return (
    <div className="p-6">
      <ReceiptForm invoiceId={fromInvoiceId || undefined} />
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
