'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import InvoiceForm from '@/components/income/InvoiceForm';
import { getInvoiceById } from '@/data/income/invoices';
import type { Invoice } from '@/data/income/types';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      const found = getInvoiceById(id);
      if (found) {
        setInvoice(found);
      } else {
        setError('Invoice not found');
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

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            {error || 'Invoice not found'}
          </h2>
          <p className="text-sm text-red-600 mb-4">
            The invoice you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/accounting/manager/income/invoices')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <InvoiceForm invoice={invoice} />
    </div>
  );
}
