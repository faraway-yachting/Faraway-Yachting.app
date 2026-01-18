"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth";
import {
  Calendar,
  List,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Home,
  User,
  Shield,
} from "lucide-react";

export type BookingsRole = "admin" | "manager" | "agent" | "viewer" | "crew" | "investor";

interface BookingsAppShellProps {
  children: ReactNode;
  currentRole: BookingsRole;
}

// Define all available menu items
const allMenuItems = [
  { name: "Calendar", href: "/bookings/{role}/calendar", icon: Calendar },
  { name: "Bookings List", href: "/bookings/{role}/list", icon: List },
  { name: "Settings", href: "/bookings/{role}/settings", icon: Settings },
];

// Role-based menu visibility
const roleConfig: Record<BookingsRole, { name: string; allowedMenus: string[] }> = {
  admin: {
    name: "Admin",
    allowedMenus: ["Calendar", "Bookings List", "Settings"],
  },
  manager: {
    name: "Manager",
    allowedMenus: ["Calendar", "Bookings List", "Settings"],
  },
  agent: {
    name: "Agent",
    allowedMenus: ["Calendar", "Bookings List"],
  },
  viewer: {
    name: "Viewer",
    allowedMenus: ["Calendar", "Bookings List"],
  },
};


// Get role display name based on user's bookings module role
function getRoleDisplayName(role: string | null, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "Super Admin";
  switch (role) {
    case 'manager': return 'Manager';
    case 'agent': return 'Agent';
    case 'crew': return 'Crew';
    case 'investor': return 'Investor';
    case 'viewer': return 'Viewer';
    default: return 'User';
  }
}

export function BookingsAppShell({ children, currentRole }: BookingsAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Get auth context for real user data
  const { user, profile, signOut, isSuperAdmin, getModuleRole, isMenuVisible } = useAuth();

  // Get user's actual role in bookings module
  const bookingsRole = getModuleRole('bookings');
  const roleDisplayName = getRoleDisplayName(bookingsRole, isSuperAdmin);

  // Use the user's actual role config, not the URL-based one
  const effectiveRole = isSuperAdmin ? 'manager' : (bookingsRole as BookingsRole) || 'viewer';
  const config = roleConfig[effectiveRole] || roleConfig['viewer'];

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Filter menu items based on role permissions
  const navigation = allMenuItems
    .filter((item) => config.allowedMenus.includes(item.name))
    .map((item) => ({
      ...item,
      href: item.href.replace("{role}", currentRole),
    }));

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
                <span className="text-blue-200 text-xs">Bookings - {config.name}</span>
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
                        ? "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
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
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] px-6 pb-2 shadow-2xl">
                <div className="flex h-20 shrink-0 items-center border-b border-white/10">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">FY</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-base">Faraway Yachting</span>
                      <span className="text-blue-200 text-xs">Bookings - {config.name}</span>
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
                                    ? "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg shadow-blue-500/30"
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
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-x-3 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="flex items-center gap-x-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-semibold text-gray-900">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
                          {isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              <Shield className="h-3 w-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 mt-1">{roleDisplayName}</p>
                      </div>
                      <div className="border-t border-gray-100 py-2">
                        <Link
                          href="/accounting/manager"
                          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <span>Go to Accounting</span>
                        </Link>
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
