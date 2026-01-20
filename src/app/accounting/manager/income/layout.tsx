'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/accounting/AppShell';

const incomeTabs = [
  { label: 'Overview', href: '/accounting/manager/income/overview' },
  { label: 'Quotations', href: '/accounting/manager/income/quotations' },
  { label: 'Invoices', href: '/accounting/manager/income/invoices' },
  { label: 'Receipts', href: '/accounting/manager/income/receipts' },
  { label: 'Credit Notes', href: '/accounting/manager/income/credit-notes' },
  { label: 'Debit Notes', href: '/accounting/manager/income/debit-notes' },
  { label: 'Billing Notes', href: '/accounting/manager/income/billing-notes' },
];

export default function IncomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell>
      {/* Module Header - Strong, Primary */}
      <div className="bg-white border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track quotations, invoices, receipts, and revenue
        </p>
      </div>

      {/* Primary Navigation Tabs - Pill/Segmented Style */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {incomeTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all
                  ${
                    isActive
                      ? 'bg-[#5A7A8F] text-white shadow-sm'
                      : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }
                `}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div className="py-6">
        {children}
      </div>
    </AppShell>
  );
}
