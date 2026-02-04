'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { User, ChevronDown, Shield, LogOut } from 'lucide-react';

interface UserDropdownProps {
  /** The module name for the profile link (e.g., 'accounting', 'hr', 'bookings') */
  module: 'accounting' | 'hr' | 'bookings';
  /** Optional role display name override */
  roleDisplayName?: string;
}

export function UserDropdown({ module, roleDisplayName: roleOverride }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut, isSuperAdmin, getModuleRole } = useAuth();

  const handleSignOut = async () => {
    setIsOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Determine role display name
  const moduleRole = getModuleRole(module);
  const roleDisplayName = roleOverride || (
    isSuperAdmin
      ? 'Super Admin'
      : moduleRole
        ? moduleRole.charAt(0).toUpperCase() + moduleRole.slice(1)
        : 'User'
  );

  // Super admins can access admin panel
  const canAccessAdmin = isSuperAdmin;

  // Profile link - use accounting profile for now (shared across modules)
  const profileLink = '/accounting/profile';

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-x-3 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-x-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] flex items-center justify-center shadow-sm">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold text-gray-900">
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500">{roleDisplayName}</p>
          </div>
        </div>
        <ChevronDown className={`hidden lg:block h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-100">
            {/* User info header */}
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

            {/* Menu items */}
            <div className="py-2">
              <Link
                href={profileLink}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4 text-gray-400" />
                My Profile
              </Link>

              {canAccessAdmin && (
                <Link
                  href="/admin/users"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Shield className="h-4 w-4 text-gray-400" />
                  Admin Panel
                </Link>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-gray-100 py-2">
              <button
                onClick={handleSignOut}
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
  );
}
