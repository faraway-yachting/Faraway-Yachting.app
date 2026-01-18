"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { ModuleCard } from "@/components/ModuleCard";
import { NotifyMeModal } from "@/components/NotifyMeModal";
import { appConfig } from "@/config/app.config";
import { modules } from "@/data/modules";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { User, LogOut, Shield } from "lucide-react";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");
  const router = useRouter();
  const { user, isSuperAdmin, isLoading, signOut } = useAuthStatus();

  // Detect invite token in URL hash and redirect to password setup
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      // If this is an invite link, redirect to password setup page with the hash
      if (accessToken && type === 'invite') {
        router.push(`/auth/setup-password${hash}`);
      }
    }
  }, [router]);

  const handleNotify = (moduleName: string) => {
    setSelectedModule(moduleName);
    setModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    // Force a full page refresh to clear any cached state
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#A8C5D6] flex flex-col">
      {/* Hero Section */}
      <section className="bg-[#A8C5D6]">
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-10 text-center">
          {/* Logo */}
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
          {isLoading ? (
            <div className="flex justify-center">
              <div className="h-12 w-48 bg-white/20 rounded-lg animate-pulse" />
            </div>
          ) : user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2.5">
                <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium">{user.email}</span>
              </div>
              {isSuperAdmin && (
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
              <Button variant="primary" size="md" href="/login">
                Sign In
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Strip */}
      <Section background="white">
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
      </Section>

      {/* Modules Section */}
      <Section background="gray">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need in One Platform
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful modules designed specifically for yacht management
            businesses.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <ModuleCard
              key={module.title}
              module={module}
              onNotify={handleNotify}
            />
          ))}
        </div>

        {/* More Modules Button */}
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

      <Footer />

      {/* Modal */}
      <NotifyMeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        moduleName={selectedModule}
      />
    </div>
  );
}
