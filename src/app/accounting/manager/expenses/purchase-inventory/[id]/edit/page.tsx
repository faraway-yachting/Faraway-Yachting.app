'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { inventoryPurchasesApi } from '@/lib/supabase/api/inventoryPurchases';
import { dbInventoryPurchaseToFrontend } from '@/lib/supabase/transforms';
import InventoryPurchaseForm from '@/components/inventory-purchases/InventoryPurchaseForm';
import type { InventoryPurchase } from '@/data/expenses/types';
import Link from 'next/link';

const basePath = '/accounting/manager/expenses/purchase-inventory';

export default function EditInventoryPurchasePage() {
  const params = useParams();
  const [purchase, setPurchase] = useState<InventoryPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadPurchase = async () => {
      if (!params.id) return;

      try {
        const purchaseId = Array.isArray(params.id) ? params.id[0] : params.id;
        const data = await inventoryPurchasesApi.getByIdWithDetails(purchaseId);

        if (!data) {
          setNotFound(true);
        } else if (data.status === 'void') {
          setNotFound(true);
        } else {
          setPurchase(dbInventoryPurchaseToFrontend(data));
        }
      } catch (error) {
        console.error('Failed to load purchase:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadPurchase();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
      </div>
    );
  }

  if (notFound || !purchase) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cannot Edit Purchase
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          The purchase was not found or has been voided.
        </p>
        <Link
          href={basePath}
          className="text-sm font-medium text-[#5A7A8F] hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <InventoryPurchaseForm
      purchase={purchase}
      basePath={basePath}
    />
  );
}
