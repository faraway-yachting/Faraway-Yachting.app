"use client";

import Link from "next/link";
import { UserCircle, Calculator, DollarSign, TrendingUp, Wallet } from "lucide-react";

const roles = [
  {
    id: "manager",
    title: "Manager",
    description: "Full access to all financial data and KPIs",
    icon: TrendingUp,
    href: "/accounting/manager",
  },
  {
    id: "accountant",
    title: "Accountant",
    description: "Manage expenses, income, reconciliation, and VAT",
    icon: Calculator,
    href: "/accounting/accountant",
  },
  {
    id: "sales",
    title: "Sales",
    description: "Create and manage invoices and receipts",
    icon: DollarSign,
    href: "/accounting/sales",
  },
  {
    id: "investor",
    title: "Investor",
    description: "View P&L and reports for invested boats (read-only)",
    icon: UserCircle,
    href: "/accounting/investor",
  },
  {
    id: "petty-cash",
    title: "Petty Cash Holder",
    description: "Manage personal wallet and transactions",
    icon: Wallet,
    href: "/accounting/petty-cash",
  },
];

export default function AccountingSelector() {
  return (
    <div className="min-h-screen bg-[#A8C5D6] flex flex-col">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Accounting & Finance
          </h1>
          <p className="text-lg text-white/90">
            Select your role to view the dashboard
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.id}
                href={role.href}
                className="bg-white/60 hover:bg-white/80 rounded-xl p-6 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border border-white/40 backdrop-blur-sm group"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[#5A7A8F] group-hover:bg-[#2c3e50] transition-colors">
                    <Icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#2c3e50]">
                    {role.title}
                  </h3>
                  <p className="text-sm text-[#2c3e50]/80">
                    {role.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white hover:text-white/80 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
