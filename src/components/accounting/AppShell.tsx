"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth";
import { usePermissions, ACCOUNTING_PERMISSIONS, ADMIN_PERMISSIONS } from "@/hooks/usePermissions";
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
  Shield,
  ArrowLeftRight,
  Banknote,
} from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

// Define menu items with their required permissions and visibility keys
// Note: Petty Cash href is dynamic and determined at render time based on permissions
const menuItems = [
  {
    name: "Dashboard",
    href: "/accounting/manager",
    icon: LayoutDashboard,
    permission: ACCOUNTING_PERMISSIONS.DASHBOARD_VIEW,
    menuKey: "dashboard",
  },
  {
    name: "Income",
    href: "/accounting/manager/income/overview",
    icon: DollarSign,
    permission: ACCOUNTING_PERMISSIONS.INCOME_VIEW,
    menuKey: "income",
  },
  {
    name: "Expenses",
    href: "/accounting/manager/expenses/overview",
    icon: TrendingDown,
    permission: ACCOUNTING_PERMISSIONS.EXPENSES_VIEW,
    menuKey: "expenses",
  },
  {
    name: "GL Categorization",
    href: "/accounting/manager/categorization",
    icon: Tags,
    permission: ACCOUNTING_PERMISSIONS.CATEGORIZATION_VIEW,
    menuKey: "gl-categorization",
  },
  {
    name: "Journal Entries",
    href: "/accounting/manager/journal-entries",
    icon: BookOpen,
    permission: ACCOUNTING_PERMISSIONS.JOURNAL_VIEW,
    menuKey: "journal-entries",
  },
  {
    name: "Bank Reconciliation",
    href: "/accounting/manager/bank-reconciliation",
    icon: Building2,
    permission: ACCOUNTING_PERMISSIONS.RECONCILIATION_VIEW,
    menuKey: "bank-reconciliation",
  },
  {
    name: "Finances",
    href: "/accounting/manager/finances/overview",
    icon: Percent,
    permission: ACCOUNTING_PERMISSIONS.FINANCES_VIEW,
    menuKey: "finances",
  },
  {
    name: "Petty Cash",
    href: "/accounting/petty-cash", // Default, will be overridden dynamically
    icon: Wallet,
    anyPermission: [ACCOUNTING_PERMISSIONS.PETTYCASH_VIEW_OWN, ACCOUNTING_PERMISSIONS.PETTYCASH_VIEW_ALL],
    menuKey: "petty-cash",
    dynamicHref: true, // Flag to indicate dynamic href determination
  },
  {
    name: "Cash Collections",
    href: "/accounting/manager/cash-collections",
    icon: Banknote,
    permission: ACCOUNTING_PERMISSIONS.FINANCES_VIEW,
    menuKey: "cash-collections",
  },
  {
    name: "Chart of Accounts",
    href: "/accounting/manager/chart-of-accounts",
    icon: BookOpen,
    permission: ACCOUNTING_PERMISSIONS.CHARTOFACCOUNTS_VIEW,
    menuKey: "chart-of-accounts",
  },
  {
    name: "Contacts",
    href: "/accounting/manager/contacts",
    icon: Users,
    permission: ACCOUNTING_PERMISSIONS.CONTACTS_VIEW,
    menuKey: "contacts",
  },
  {
    name: "Companies",
    href: "/accounting/manager/companies",
    icon: Building,
    permission: ACCOUNTING_PERMISSIONS.SETTINGS_VIEW,
    menuKey: "companies",
  },
  {
    name: "Intercompany",
    href: "/accounting/manager/intercompany",
    icon: ArrowLeftRight,
    permission: ACCOUNTING_PERMISSIONS.SETTINGS_VIEW,
    menuKey: "intercompany",
  },
  {
    name: "Commissions",
    href: "/accounting/manager/commissions",
    icon: Percent,
    permission: ACCOUNTING_PERMISSIONS.SETTINGS_VIEW,
    menuKey: "commissions",
  },
  {
    name: "Reports",
    href: "/accounting/manager/reports",
    icon: BarChart3,
    anyPermission: [ACCOUNTING_PERMISSIONS.REPORTS_VIEW_BASIC, ACCOUNTING_PERMISSIONS.REPORTS_VIEW_MANAGEMENT, ACCOUNTING_PERMISSIONS.REPORTS_VIEW_INVESTOR],
    menuKey: "reports",
  },
  {
    name: "Settings",
    href: "/accounting/manager/settings",
    icon: Settings,
    permission: ACCOUNTING_PERMISSIONS.SETTINGS_MANAGE,
    menuKey: "settings",
  },
];

// Get role display name based on user's accounting module role
function getRoleDisplayName(role: string | null, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "Super Admin";
  switch (role) {
    case 'manager': return 'Manager';
    case 'accountant': return 'Accountant';
    case 'sales': return 'Sales';
    case 'investor': return 'Investor';
    case 'petty-cash': return 'Petty Cash Holder';
    default: return 'User';
  }
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const pathname = usePathname();

  // Get auth and permissions
  const { user, profile, signOut, isSuperAdmin, getModuleRole, isMenuVisible } = useAuth();
  const { hasPermission, hasAnyPermission, can } = usePermissions();

  // Get user's role in accounting module
  const accountingRole = getModuleRole('accounting');
  const roleDisplayName = getRoleDisplayName(accountingRole, isSuperAdmin);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Notification context (optional - may not be wrapped in provider)
  const notificationContext = useNotificationsOptional();

  // Map role to notification target role
  const notificationRole: NotificationTargetRole =
    accountingRole === 'petty-cash' ? 'petty_cash_holder' : (accountingRole as NotificationTargetRole) || 'manager';

  // Update notification context when role changes
  useEffect(() => {
    if (notificationContext) {
      notificationContext.setCurrentRole(notificationRole);
    }
  }, [notificationRole, notificationContext]);

  // Determine dynamic href for Petty Cash based on permissions
  const getPettyCashHref = () => {
    // If user has view_all permission (manager), show management page with toggle
    if (isSuperAdmin || hasPermission(ACCOUNTING_PERMISSIONS.PETTYCASH_VIEW_ALL)) {
      return '/accounting/manager/petty-cash-management';
    }
    // Otherwise, show personal wallet page only
    return '/accounting/petty-cash';
  };

  // Filter menu items based on user's permissions and menu visibility settings
  const navigation = menuItems
    .filter((item) => {
      // First check menu visibility settings from role config
      // Super admin always sees everything, isMenuVisible handles this
      if (!isMenuVisible('accounting', item.menuKey)) {
        return false;
      }

      // Super admin sees everything (already passed visibility check)
      if (isSuperAdmin) return true;

      // Check single permission
      if (item.permission) {
        return hasPermission(item.permission);
      }

      // Check any of multiple permissions
      if (item.anyPermission) {
        return hasAnyPermission(item.anyPermission);
      }

      return false;
    })
    .map((item) => {
      // Handle dynamic href for Petty Cash
      if (item.menuKey === 'petty-cash') {
        return { ...item, href: getPettyCashHref() };
      }
      return item;
    });

  // Check if user can access admin
  const canAccessAdmin = can.manageUsers();

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
                <span className="text-blue-200 text-xs">{roleDisplayName}</span>
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
                      <span className="text-blue-200 text-xs">{roleDisplayName}</span>
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
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="flex items-center gap-x-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] flex items-center justify-center shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">{roleDisplayName}</p>
                    </div>
                  </div>
                  <ChevronDown className="hidden lg:block h-4 w-4 text-gray-400" />
                </button>

                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-100">
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isSuperAdmin
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {roleDisplayName}
                          </span>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/accounting/profile"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <User className="h-4 w-4 text-gray-400" />
                          My Profile
                        </Link>
                        {canAccessAdmin && (
                          <Link
                            href="/admin/users"
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            <Shield className="h-4 w-4 text-gray-400" />
                            Admin Panel
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleSignOut();
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 text-gray-400" />
                          Sign Out
                        </button>
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
