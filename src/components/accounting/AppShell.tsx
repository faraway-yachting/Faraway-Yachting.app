"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from './NotificationDropdown';
import { useNotificationsOptional } from '@/contexts/NotificationContext';
import type { NotificationTargetRole } from '@/data/notifications/types';
import {
  LayoutDashboard,
  DollarSign,
  TrendingDown,
  Building2,
  Building,
  Percent,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Home,
  Search,
  Bell,
  User,
  BookOpen,
  Calendar,
  Users,
  Tags,
} from "lucide-react";

interface AppShellProps {
  children: ReactNode;
  currentRole: "manager" | "accountant" | "sales" | "investor" | "petty-cash";
}

// Define all available menu items
const allMenuItems = [
  { name: "Dashboard", href: "/accounting/{role}", icon: LayoutDashboard },
  { name: "Income", href: "/accounting/{role}/income/overview", icon: DollarSign },
  { name: "Expenses", href: "/accounting/{role}/expenses", icon: TrendingDown },
  { name: "GL Categorization", href: "/accounting/{role}/categorization", icon: Tags },
  { name: "Journal Entries", href: "/accounting/{role}/journal-entries", icon: BookOpen },
  { name: "Bank Reconciliation", href: "/accounting/{role}/bank-reconciliation", icon: Building2 },
  { name: "Finances", href: "/accounting/{role}/finances/overview", icon: Percent },
  { name: "Petty Cash", href: "/accounting/{role}/petty-cash-management", icon: Wallet },
  { name: "Chart of Accounts", href: "/accounting/{role}/chart-of-accounts", icon: BookOpen },
  { name: "Contacts", href: "/accounting/{role}/contacts", icon: Users },
  { name: "Companies", href: "/accounting/{role}/companies", icon: Building },
  { name: "Reports", href: "/accounting/{role}/reports", icon: BarChart3 },
  { name: "Settings", href: "/accounting/{role}/settings", icon: Settings },
];

// Role-based menu visibility
const roleConfig = {
  manager: {
    name: "Manager",
    allowedMenus: ["Dashboard", "Income", "Expenses", "GL Categorization", "Journal Entries", "Bank Reconciliation", "Finances", "Petty Cash", "Chart of Accounts", "Contacts", "Reports", "Settings"],
  },
  accountant: {
    name: "Accountant",
    allowedMenus: ["Dashboard", "Income", "Expenses", "GL Categorization", "Journal Entries", "Bank Reconciliation", "Finances", "Petty Cash", "Chart of Accounts", "Contacts", "Companies"],
  },
  sales: {
    name: "Sales",
    allowedMenus: ["Dashboard", "Income", "Contacts"],
  },
  investor: {
    name: "Investor",
    allowedMenus: ["Dashboard", "Reports"],
  },
  "petty-cash": {
    name: "Petty Cash Holder",
    allowedMenus: ["Petty Cash"],
  },
};

const allRoles = [
  { id: "manager", name: "Manager" },
  { id: "accountant", name: "Accountant" },
  { id: "sales", name: "Sales" },
  { id: "investor", name: "Investor" },
  { id: "petty-cash", name: "Petty Cash Holder" },
];

export function AppShell({ children, currentRole }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const pathname = usePathname();
  const config = roleConfig[currentRole];

  // Notification context (optional - may not be wrapped in provider)
  const notificationContext = useNotificationsOptional();

  // Map role to notification target role
  const notificationRole: NotificationTargetRole =
    currentRole === 'petty-cash' ? 'petty_cash_holder' : currentRole as NotificationTargetRole;

  // Update notification context when role changes
  useEffect(() => {
    if (notificationContext) {
      notificationContext.setCurrentRole(notificationRole);
    }
  }, [notificationRole, notificationContext]);

  // Filter menu items based on role permissions
  // For accountant role, redirect to manager pages for sections that only exist under manager
  const managerOnlyPaths = ["income", "petty-cash-management", "chart-of-accounts", "companies"];

  const navigation = allMenuItems
    .filter((item) => config.allowedMenus.includes(item.name))
    .map((item) => {
      let href = item.href.replace("{role}", currentRole);

      // For accountant role, redirect to manager pages for these sections
      if (currentRole === "accountant") {
        for (const path of managerOnlyPaths) {
          if (item.href.includes(path)) {
            href = item.href.replace("{role}", "manager");
            break;
          }
        }
      }

      return { ...item, href };
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#1e3a5f] to-[#2c3e50] shadow-2xl">
          {/* Logo */}
          <div className="flex h-20 flex-shrink-0 items-center px-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">FY</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base">Faraway Yachting</span>
                <span className="text-blue-200 text-xs">{config.name}</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
            <nav className="flex-1 space-y-2 px-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] text-white shadow-lg shadow-[#5A7A8F]/30"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Links */}
            <div className="mt-auto space-y-2 px-4 pb-6 border-t border-white/10 pt-6">
              <Link
                href="/"
                className="group flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
              >
                <Home className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white" />
                Home
              </Link>
              <Link
                href="/accounting"
                className="group flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
              >
                <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white" />
                Switch Role
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="relative z-50 md:hidden">
          <div
            className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-[#1e3a5f] to-[#2c3e50] px-6 pb-2 shadow-2xl">
                <div className="flex h-20 shrink-0 items-center border-b border-white/10">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">FY</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-base">Faraway Yachting</span>
                      <span className="text-blue-200 text-xs">{config.name}</span>
                    </div>
                  </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="space-y-2">
                        {navigation.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                  isActive
                                    ? "bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] text-white shadow-lg shadow-[#5A7A8F]/30"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <Icon className="h-5 w-5 shrink-0" />
                                {item.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                    <li className="mt-auto space-y-2 border-t border-white/10 pt-6">
                      <Link
                        href="/"
                        onClick={() => setSidebarOpen(false)}
                        className="group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                      >
                        <Home className="h-5 w-5 shrink-0" />
                        Home
                      </Link>
                      <Link
                        href="/accounting"
                        onClick={() => setSidebarOpen(false)}
                        className="group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                      >
                        <LogOut className="h-5 w-5 shrink-0" />
                        Switch Role
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
            {/* Search bar */}
            <form className="relative flex flex-1 max-w-md" action="#" method="GET">
              <label htmlFor="search-field" className="sr-only">
                Search
              </label>
              <div className="relative w-full">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="search-field"
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#5A7A8F] focus:bg-white focus:ring-2 focus:ring-[#5A7A8F]/20 focus:outline-none transition-all"
                  placeholder="Search transactions, invoices..."
                  type="search"
                  name="search"
                />
              </div>
            </form>

            {/* Right side icons */}
            <div className="flex items-center gap-x-3 ml-auto">
              {/* Date range display - optional */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                >
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {notificationContext && notificationContext.unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>
                <NotificationDropdown
                  isOpen={notificationDropdownOpen}
                  onClose={() => setNotificationDropdownOpen(false)}
                />
              </div>

              {/* Separator */}
              <div
                className="hidden lg:block h-8 w-px bg-gray-200"
                aria-hidden="true"
              />

              {/* User profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-x-3 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                >
                  <div className="flex items-center gap-x-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] flex items-center justify-center shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-semibold text-gray-900">Admin User</p>
                      <p className="text-xs text-gray-500">{config.name}</p>
                    </div>
                  </div>
                  <ChevronDown className="hidden lg:block h-4 w-4 text-gray-400" />
                </button>

                {roleDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setRoleDropdownOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-100">
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Admin User</p>
                        <p className="text-xs text-gray-500">admin@farawayyachting.com</p>
                      </div>
                      <div className="py-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Switch Role
                        </div>
                        {allRoles.map((role) => (
                          <Link
                            key={role.id}
                            href={`/accounting/${role.id}`}
                            className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                              role.id === currentRole
                                ? "bg-blue-50 text-[#5A7A8F] font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                            onClick={() => setRoleDropdownOpen(false)}
                          >
                            <div className={`h-2 w-2 rounded-full ${role.id === currentRole ? 'bg-[#5A7A8F]' : 'bg-gray-300'}`}></div>
                            {role.name}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 py-2">
                        <Link
                          href="/accounting"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 text-gray-400" />
                          Sign Out
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
