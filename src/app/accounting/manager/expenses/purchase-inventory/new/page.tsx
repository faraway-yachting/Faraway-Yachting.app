'use client';

import { Suspense } from 'react';
import InventoryPurchaseForm from '@/components/inventory-purchases/InventoryPurchaseForm';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

export default function NewInventoryPurchasePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InventoryPurchaseForm
        basePath="/accounting/manager/expenses/purchase-inventory"
      />
    </Suspense>
  );
}
