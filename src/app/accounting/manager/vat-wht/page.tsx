"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VATWHTRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accounting/manager/finances/overview');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Finances...</p>
      </div>
    </div>
  );
}
