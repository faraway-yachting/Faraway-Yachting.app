'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/accounting/AppShell';

const expensesTabs = [
  { label: 'Overview', href: '/accounting/accountant/expenses/overview' },
  { label: 'Expense Record', href: '/accounting/accountant/expenses/expense-records' },
  { label: 'Purchase Inventory', href: '/accounting/accountant/expenses/purchase-inventory' },
  { label: 'Purchase Order (Asset)', href: '/accounting/accountant/expenses/purchase-assets' },
  { label: 'Receive Credit Note', href: '/accounting/accountant/expenses/credit-notes' },
  { label: 'Receive Debit Note', href: '/accounting/accountant/expenses/debit-notes' },
];

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell>
      {/* Module Header */}
      <div className="bg-white border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-1 text-sm text-gray-500">
          Record expenses, purchases, and manage supplier documents
        </p>
      </div>

      {/* Primary Navigation Tabs - Pill/Segmented Style */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {expensesTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
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
