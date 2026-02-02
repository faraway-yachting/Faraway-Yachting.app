'use client';

import { useState } from 'react';
import { AppShell } from '@/components/accounting/AppShell';
import ConfigurationTab from '@/components/intercompany/ConfigurationTab';
import CharterTrackingTab from '@/components/intercompany/CharterTrackingTab';

type Tab = 'configuration' | 'tracking';

export default function IntercompanyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('configuration');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'configuration', label: 'Configuration' },
    { key: 'tracking', label: 'Charter Tracking' },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intercompany Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage charter fee configuration and intercompany settlements
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#5A7A8F] text-[#5A7A8F]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'configuration' && <ConfigurationTab />}
        {activeTab === 'tracking' && <CharterTrackingTab />}
      </div>
    </AppShell>
  );
}
