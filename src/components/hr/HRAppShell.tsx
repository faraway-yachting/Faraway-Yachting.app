"use client";

import { useState, useMemo, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth";
import { usePermissions, HR_PERMISSIONS } from "@/hooks/usePermissions";
import { UserDropdown } from "@/components/shared/UserDropdown";
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  Home,
  Calendar,
  CalendarDays,
  Banknote,
  Ship,
  Shield,
  Settings,
} from "lucide-react";

interface HRAppShellProps {
  children: ReactNode;
}

const allMenuItems = [
  {
    name: "Dashboard",
    href: "/hr/manager",
    icon: LayoutDashboard,
    menuKey: "dashboard",
    permission: HR_PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    name: "Employees",
    href: "/hr/manager/employees",
    icon: Users,
    menuKey: "employees",
    permission: HR_PERMISSIONS.EMPLOYEES_VIEW,
  },
  {
    name: "Leave",
    href: "/hr/manager/leave",
    icon: CalendarDays,
    menuKey: "leave",
    permission: HR_PERMISSIONS.LEAVE_VIEW,
  },
  {
    name: "Payroll",
    href: "/hr/manager/payroll",
    icon: Banknote,
    menuKey: "payroll",
    permission: HR_PERMISSIONS.PAYROLL_VIEW,
  },
  {
    name: "Crew Schedule",
    href: "/hr/manager/crew-schedule",
    icon: Calendar,
    menuKey: "crew-schedule",
    permission: HR_PERMISSIONS.CREW_SCHEDULE_VIEW,
  },
  {
    name: "Charter Bonus",
    href: "/hr/manager/charter-bonus",
    icon: Ship,
    menuKey: "charter-bonus",
    permission: HR_PERMISSIONS.CHARTER_BONUS_VIEW,
  },
  {
    name: "Settings",
    href: "/hr/manager/settings",
    icon: Settings,
    menuKey: "settings",
    permission: HR_PERMISSIONS.SETTINGS_VIEW,
  },
];

export function HRAppShell({ children }: HRAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const { isSuperAdmin, isMenuVisible } = useAuth();
  const { hasPermission } = usePermissions();

  const canAccessAdmin = isSuperAdmin;

  // Filter menu items based on database menu visibility + permissions
  const menuItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      if (isSuperAdmin) return true;
      if (!isMenuVisible('hr', item.menuKey)) return false;
      return hasPermission(item.permission);
    });
  }, [isSuperAdmin, isMenuVisible, hasPermission]);

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
                <span className="text-blue-200 text-xs">HR Module</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
            <nav className="flex-1 space-y-2 px-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/hr/manager' && pathname.startsWith(item.href + '/'));
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
              {canAccessAdmin && (
                <Link
                  href="/admin/users"
                  className="group flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
                >
                  <Shield className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white" />
                  Admin
                </Link>
              )}
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
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors" onClick={() => setSidebarOpen(false)}>
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
                      <span className="text-blue-200 text-xs">HR Module</span>
                    </div>
                  </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="space-y-2">
                        {menuItems.map((item) => {
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
                      <Link href="/" onClick={() => setSidebarOpen(false)} className="group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200">
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
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700 md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
            <div className="flex-1" />

            {/* Right side */}
            <div className="flex items-center gap-x-3 ml-auto">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="hidden lg:block h-8 w-px bg-gray-200" aria-hidden="true" />

              {/* User profile dropdown */}
              <UserDropdown module="hr" />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-8">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
