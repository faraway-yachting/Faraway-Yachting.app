'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Lock } from 'lucide-react';
import { Suspense } from 'react';

const MODULE_NAMES: Record<string, string> = {
  accounting: 'Accounting and Finance',
  bookings: 'Bookings',
  inventory: 'Inventory',
  maintenance: 'Maintenance',
  customers: 'Customers',
  hr: 'HR',
};

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const module = searchParams.get('module');
  const moduleName = module ? MODULE_NAMES[module] : null;

  const isModuleRestriction = !!moduleName;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isModuleRestriction ? 'bg-amber-100' : 'bg-red-100'
        }`}>
          {isModuleRestriction ? (
            <Lock className="w-8 h-8 text-amber-600" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-red-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isModuleRestriction ? 'Module Access Required' : 'Access Denied'}
        </h1>
        <p className="text-gray-600 mb-8">
          {isModuleRestriction ? (
            <>
              You don&apos;t have access to the <strong>{moduleName}</strong> module.
              Please contact your administrator to request access.
            </>
          ) : (
            'You don\'t have permission to access this page. This area is restricted to authorized administrators only.'
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#5A7A8F] border-t-transparent rounded-full" />
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
