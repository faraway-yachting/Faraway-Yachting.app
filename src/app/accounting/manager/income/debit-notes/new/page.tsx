'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DebitNoteForm from '@/components/income/DebitNoteForm';

function NewDebitNoteContent() {
  const searchParams = useSearchParams();
  const fromReceiptId = searchParams.get('from');

  return (
    <div className="p-6">
      <DebitNoteForm receiptId={fromReceiptId || undefined} />
    </div>
  );
}

export default function NewDebitNotePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <NewDebitNoteContent />
    </Suspense>
  );
}
