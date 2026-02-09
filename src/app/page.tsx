"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { ModuleCard } from "@/components/ModuleCard";
import { NotifyMeModal } from "@/components/NotifyMeModal";
import { appConfig } from "@/config/app.config";
import { modules, Module } from "@/data/modules";
import { User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ModuleName } from "@/lib/supabase/api/userModuleRoles";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");
  const router = useRouter();

  // Use the centralized AuthProvider instead of a duplicate listener
  const { user, profile, isSuperAdmin, canManageUsers, moduleRoles, isLoading, signOut } = useAuth();

  // Derive module access from moduleRoles
  const moduleAccess = useMemo(() =>
    moduleRoles.map(r => r.module as ModuleName),
    [moduleRoles]
  );

  const visibleModules = useMemo((): Module[] => {
    // Not logged in: show all modules (landing page)
    if (!user) return modules;
    // Still loading auth data: show nothing to prevent flash
    if (isLoading) return [];
    // Super admin: show all
    if (isSuperAdmin) return modules;
    // Authenticated user: show only modules they have active roles for
    return modules.filter((m) => moduleAccess.includes(m.moduleKey));
  }, [user, isLoading, isSuperAdmin, moduleAccess]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      if (accessToken && type === 'invite') {
        router.push(`/auth/setup-password${hash}`);
      }
    }
  }, [router]);

  const handleNotify = (moduleName: string) => {
    setSelectedModule(moduleName);
    setModalOpen(true);
  };

  // Use the centralized signOut from AuthProvider (handles global scope + client cleanup)
  const handleSignOut = () => signOut();

  return (
    <div className="min-h-screen bg-[#A8C5D6] flex flex-col">
      <section className="bg-[#A8C5D6]">
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-10 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-40 h-40 bg-white rounded-full p-4">
              <Image
                src="/logo.jpg"
                alt="Faraway Yachting Logo"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
          </div>

          {user ? (
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
            </h1>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {appConfig.tagline}
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-4xl mx-auto mb-6">
                {appConfig.description}
              </p>
            </>
          )}

          {user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2.5">
                <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium">{user.email}</span>
              </div>
              {!isLoading && (isSuperAdmin || canManageUsers) && (
                <Button variant="primary" size="md" href="/admin/users">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" size="md" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              {/* Using plain anchor tag - always accessible even if auth is slow */}
              <a
                href="/login"
                className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-[#5A7A8F] text-white hover:bg-[#2c3e50] focus:ring-[#5A7A8F] shadow-md hover:shadow-lg px-6 py-3 text-base"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      </section>

      <Section background="gray">
        {user && !isLoading && visibleModules.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Modules Assigned</h3>
            <p className="text-gray-500">Contact your administrator to get access to modules.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleModules.map((module) => (
              <ModuleCard
                key={module.title}
                module={module}
                onNotify={handleNotify}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5A7A8F] hover:text-[#2c3e50] transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            More modules
          </button>
        </div>
      </Section>

      <footer className="bg-[#A8C5D6]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {appConfig.benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3b9fc2] rounded-full mb-4">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-white/30 mt-10 pt-6 text-center">
            <p className="text-sm text-gray-700">&copy; 2026 Faraway Yachting. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <NotifyMeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        moduleName={selectedModule}
      />
    </div>
  );
}
