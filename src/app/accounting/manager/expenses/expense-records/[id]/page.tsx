'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { getExpenseRecordById } from '@/data/expenses/expenses';
import type { ExpenseRecord } from '@/data/expenses/types';

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (params.id) {
      const expenseId = Array.isArray(params.id) ? params.id[0] : params.id;
      const found = getExpenseRecordById(expenseId);

      if (found) {
        setExpense(found);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F] mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Expense Not Found
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            The expense record you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/accounting/manager/expenses/expense-records')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            Back to Expense Records
          </button>
        </div>
      </div>
    );
  }

  return <ExpenseForm expense={expense!} />;
}
