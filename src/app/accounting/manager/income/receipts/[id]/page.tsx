'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReceiptForm from '@/components/income/ReceiptForm';
import { getReceiptById } from '@/data/income/receipts';
import type { Receipt } from '@/data/income/types';

export default function EditReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      const found = getReceiptById(id);
      if (found) {
        setReceipt(found);
      } else {
        setError('Receipt not found');
      }
    }
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            {error || 'Receipt not found'}
          </h2>
          <p className="text-sm text-red-600 mb-4">
            The receipt you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/accounting/manager/income/receipts')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            Back to Receipts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ReceiptForm receipt={receipt} />
    </div>
  );
}
