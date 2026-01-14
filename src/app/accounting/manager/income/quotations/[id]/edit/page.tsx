'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import QuotationForm from '@/components/income/QuotationForm';
import { quotationsApi } from '@/lib/supabase/api/quotations';
import { dbQuotationToFrontend } from '@/lib/supabase/transforms';
import type { Quotation } from '@/data/income/types';

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      const id = params.id as string;
      if (id) {
        try {
          const result = await quotationsApi.getByIdWithLineItems(id);
          if (result) {
            const transformed = dbQuotationToFrontend(result, result.line_items);
            setQuotation(transformed);
          } else {
            setError('Quotation not found');
          }
        } catch (err) {
          console.error('Error fetching quotation:', err);
          setError('Failed to load quotation');
        }
      }
      setLoading(false);
    };

    fetchQuotation();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            {error || 'Quotation not found'}
          </h2>
          <p className="text-sm text-red-600 mb-4">
            The quotation you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/accounting/manager/income/quotations')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <QuotationForm quotation={quotation} />
    </div>
  );
}
