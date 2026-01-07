'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceForm from '@/components/income/InvoiceForm';

function NewInvoiceContent() {
  const searchParams = useSearchParams();
  const fromQuotationId = searchParams.get('from');

  return (
    <div className="p-6">
      <InvoiceForm quotationId={fromQuotationId || undefined} />
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
