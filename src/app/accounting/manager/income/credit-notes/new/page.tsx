'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CreditNoteForm from '@/components/income/CreditNoteForm';

function NewCreditNoteContent() {
  const searchParams = useSearchParams();
  const fromReceiptId = searchParams.get('from');

  return (
    <div className="p-6">
      <CreditNoteForm receiptId={fromReceiptId || undefined} />
    </div>
  );
}

export default function NewCreditNotePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <NewCreditNoteContent />
    </Suspense>
  );
}
