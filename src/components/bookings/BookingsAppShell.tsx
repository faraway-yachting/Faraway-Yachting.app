"use client";

import { useState, useMemo, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth";
import { UserDropdown } from "@/components/shared/UserDropdown";
import {
  Calendar,
  List,
  Settings,
  Menu,
  X,
  Home,
  Shield,
  Users,
  Anchor,
  Banknote,
  Package,
  Car,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export type BookingsRole = "admin" | "manager" | "agent" | "viewer" | "crew" | "investor";

interface BookingsAppShellProps {
  children: ReactNode;
  currentRole: BookingsRole;
}

// Menu item types supporting flat items and collapsible groups
interface MenuItem {
  name: string;
  href: string;
  icon: typeof Calendar;
  menuKey: string;
}

interface MenuGroup {
  groupName: string;
  groupIcon: typeof Calendar;
  menuKey: string;
  children: MenuItem[];
}

type NavigationItem = MenuItem | MenuGroup;

function isMenuGroup(item: NavigationItem): item is MenuGroup {
  return 'children' in item;
}

// Define all available menu items with menu keys for database-driven visibility
const allMenuItems: NavigationItem[] = [
  { name: "Calendar", href: "/bookings/{role}/calendar", icon: Calendar, menuKey: "calendar" },
  { name: "Bookings List", href: "/bookings/{role}/list", icon: List, menuKey: "list" },
  { name: "Agencies", href: "/bookings/{role}/agencies", icon: Users, menuKey: "agencies" },
  { name: "Boat Register", href: "/bookings/{role}/boats", icon: Anchor, menuKey: "boats" },
  { name: "Agency Payments", href: "/bookings/{role}/agency-payments", icon: Banknote, menuKey: "agency_payments" },
  {
    groupName: "Extra",
    groupIcon: Package,
    menuKey: "extra",
    children: [
      { name: "Taxi", href: "/bookings/{role}/taxi", icon: Car, menuKey: "taxi" },
    ],
  },
  { name: "Settings", href: "/bookings/{role}/settings", icon: Settings, menuKey: "settings" },
];

// Role display names - used as fallback if role_definitions not loaded
const roleDisplayNames: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  agent: "Agent",
  crew: "Crew",
  investor: "Investor",
  viewer: "Viewer",
};

export function BookingsAppShell({ children, currentRole }: BookingsAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  // Get auth context for real user data
  const { isSuperAdmin, getModuleRole, isMenuVisible } = useAuth();

  // Get user's actual role in bookings module
  const bookingsRole = getModuleRole('bookings');
  const roleName = isSuperAdmin ? "Super Admin" : (roleDisplayNames[bookingsRole || ''] || 'User');

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Filter menu items based on database menu visibility - memoized
  const navigation = useMemo(() => {
    return allMenuItems
      .filter((item) => {
        if (isSuperAdmin) return true;
        if (isMenuGroup(item)) {
          // Show group if at least one child is visible
          return item.children.some((child) => isMenuVisible('bookings', child.menuKey));
        }
        return isMenuVisible('bookings', item.menuKey);
      })
      .map((item) => {
        if (isMenuGroup(item)) {
          return {
            ...item,
            children: item.children
              .filter((child) => isSuperAdmin || isMenuVisible('bookings', child.menuKey))
              .map((child) => ({ ...child, href: child.href.replace("{role}", currentRole) })),
          };
        }
        return { ...item, href: (item as MenuItem).href.replace("{role}", currentRole) };
      });
  }, [isSuperAdmin, isMenuVisible, currentRole]);

  // Auto-expand groups when a child route is active
  const isChildActive = (group: MenuGroup) =>
    group.children.some((child) => {
      const href = child.href.replace("{role}", currentRole);
      return pathname === href || pathname.startsWith(href + '/');
    });

  const isGroupExpanded = (group: MenuGroup) =>
    expandedGroups[group.menuKey] ?? isChildActive(group);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] shadow-2xl">
          {/* Logo */}
          <div className="flex h-20 flex-shrink-0 items-center px-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">FY</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base">Faraway Yachting</span>
                <span className="text-blue-200 text-xs">Bookings - {roleName}</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
            <nav className="flex-1 space-y-2 px-4">
              {navigation.map((item) => {
                if (isMenuGroup(item)) {
                  const GroupIcon = item.groupIcon;
                  const expanded = isGroupExpanded(item);
                  const groupActive = isChildActive(item);
                  return (
                    <div key={item.groupName}>
                      <button
                        onClick={() => toggleGroup(item.menuKey)}
                        className={`w-full group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          groupActive
                            ? "text-white bg-white/5"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <GroupIcon className={`mr-3 h-5 w-5 flex-shrink-0 ${groupActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                        {item.groupName}
                        {expanded ? (
                          <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      {expanded && (
                        <div className="mt-1 ml-4 space-y-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
                            return (
                              <Link
                                key={child.name}
                                href={child.href}
                                className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                  isActive
                                    ? "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <ChildIcon className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                const menuItem = item as MenuItem;
                const Icon = menuItem.icon;
                const isActive = pathname === menuItem.href || pathname.startsWith(menuItem.href + '/');
                return (
                  <Link
                    key={menuItem.name}
                    href={menuItem.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                      }`}
                    />
                    {menuItem.name}
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
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] px-6 pb-2 shadow-2xl">
                <div className="flex h-20 shrink-0 items-center border-b border-white/10">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">FY</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-base">Faraway Yachting</span>
                      <span className="text-blue-200 text-xs">Bookings - {roleName}</span>
                    </div>
                  </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="space-y-2">
                        {navigation.map((item) => {
                          if (isMenuGroup(item)) {
                            const GroupIcon = item.groupIcon;
                            const expanded = isGroupExpanded(item);
                            const groupActive = isChildActive(item);
                            return (
                              <li key={item.groupName}>
                                <button
                                  onClick={() => toggleGroup(item.menuKey)}
                                  className={`w-full group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                    groupActive
                                      ? "text-white bg-white/5"
                                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  <GroupIcon className="h-5 w-5 shrink-0" />
                                  {item.groupName}
                                  {expanded ? (
                                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                {expanded && (
                                  <ul className="mt-1 ml-4 space-y-1">
                                    {item.children.map((child) => {
                                      const ChildIcon = child.icon;
                                      const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
                                      return (
                                        <li key={child.name}>
                                          <Link
                                            href={child.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`group flex items-center gap-x-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                                              isActive
                                                ? "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
                                                : "text-gray-300 hover:bg-white/10 hover:text-white"
                                            }`}
                                          >
                                            <ChildIcon className="h-4 w-4 shrink-0" />
                                            {child.name}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </li>
                            );
                          }
                          const menuItem = item as MenuItem;
                          const Icon = menuItem.icon;
                          const isActive = pathname === menuItem.href || pathname.startsWith(menuItem.href + '/');
                          return (
                            <li key={menuItem.name}>
                              <Link
                                href={menuItem.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                  isActive
                                    ? "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <Icon className="h-5 w-5 shrink-0" />
                                {menuItem.name}
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
            {/* Title area */}
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">Booking Calendar</h1>
            </div>

            {/* Right side icons */}
            <div className="flex items-center gap-x-3 ml-auto">
              {/* Date display */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Separator */}
              <div
                className="hidden lg:block h-8 w-px bg-gray-200"
                aria-hidden="true"
              />

              {/* User profile dropdown */}
              <UserDropdown module="bookings" />
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
