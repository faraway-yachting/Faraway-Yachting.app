'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { journalEventSettingsApi, type JournalEventSetting } from '@/lib/supabase/api/journalEventSettings';
import { EVENT_TYPE_METADATA, type AccountingEventType } from '@/lib/accounting/eventTypes';
import AccountCodeSelector from './AccountCodeSelector';

interface Company {
  id: string;
  name: string;
  isActive?: boolean;
}

interface JournalEventSettingsProps {
  companies: Company[];
}

// Get all event types from the metadata
const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_METADATA) as AccountingEventType[];

interface EventSettingRow {
  eventType: AccountingEventType;
  label: string;
  description: string;
  isEnabled: boolean;
  autoPost: boolean;
  defaultDebitAccount: string | null;
  defaultCreditAccount: string | null;
  settingId: string | null;
  isDirty: boolean;
}

export function JournalEventSettings({ companies }: JournalEventSettingsProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<EventSettingRow[]>([]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Load settings from database
  const loadSettings = useCallback(async () => {
    if (!selectedCompanyId) {
      setSettings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dbSettings = await journalEventSettingsApi.getByCompany(selectedCompanyId);

      // Create a map for quick lookup
      const settingsMap = new Map<string, JournalEventSetting>();
      dbSettings.forEach((s) => settingsMap.set(s.event_type, s));

      // Build the settings rows, using defaults where no setting exists
      const rows: EventSettingRow[] = ALL_EVENT_TYPES.map((eventType) => {
        const dbSetting = settingsMap.get(eventType);
        const metadata = EVENT_TYPE_METADATA[eventType];

        return {
          eventType,
          label: metadata.label,
          description: metadata.description,
          isEnabled: dbSetting?.is_enabled ?? true, // Default: enabled
          autoPost: dbSetting?.auto_post ?? false, // Default: draft
          defaultDebitAccount: dbSetting?.default_debit_account ?? null,
          defaultCreditAccount: dbSetting?.default_credit_account ?? null,
          settingId: dbSetting?.id ?? null,
          isDirty: false,
        };
      });

      setSettings(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update a setting value
  const updateSetting = (eventType: AccountingEventType, field: string, value: boolean | string | null) => {
    setSettings((prev) =>
      prev.map((row) =>
        row.eventType === eventType
          ? { ...row, [field]: value, isDirty: true }
          : row
      )
    );
  };

  // Save all dirty settings
  const saveAllDirty = async () => {
    const dirtySettings = settings.filter((s) => s.isDirty);
    if (dirtySettings.length === 0 || !selectedCompanyId) return;

    setSaving(true);
    setError(null);

    try {
      const settingsToSave = dirtySettings.map((s) => ({
        company_id: selectedCompanyId,
        event_type: s.eventType,
        is_enabled: s.isEnabled,
        auto_post: s.autoPost,
        default_debit_account: s.defaultDebitAccount,
        default_credit_account: s.defaultCreditAccount,
      }));

      await journalEventSettingsApi.bulkUpsert(settingsToSave);

      // Mark all as saved
      setSettings((prev) =>
        prev.map((r) => ({ ...r, isDirty: false }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasDirtySettings = settings.some((s) => s.isDirty);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-[#5A7A8F]" />
          <h2 className="text-lg font-semibold text-gray-900">Journal Event Settings</h2>
        </div>
        {hasDirtySettings && (
          <button
            onClick={saveAllDirty}
            disabled={saving}
            className="text-sm bg-[#5A7A8F] text-white px-4 py-2 rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600">
        Configure how accounting events generate journal entries per company. You can enable/disable event types,
        set auto-post behavior, and define default GL accounts.
      </p>

      {/* Company Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Company
        </label>
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
        >
          <option value="">-- Select a company --</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name} {company.isActive === false && "(Inactive)"}
            </option>
          ))}
        </select>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* No company selected */}
      {!selectedCompanyId && (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Select a company to configure journal event settings</p>
        </div>
      )}

      {/* Loading */}
      {selectedCompanyId && loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading settings for {selectedCompany?.name}...</span>
        </div>
      )}

      {/* Settings table */}
      {selectedCompanyId && !loading && settings.length > 0 && (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Event Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                    Enabled
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                    Auto-Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                    Default Debit Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                    Default Credit Account
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.map((row) => (
                  <tr
                    key={row.eventType}
                    className={`${!row.isEnabled ? 'bg-gray-50 opacity-75' : ''} ${row.isDirty ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{row.label}</div>
                      <div className="text-xs text-gray-500">{row.description}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.isEnabled}
                        onChange={(e) => updateSetting(row.eventType, 'isEnabled', e.target.checked)}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F] h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.autoPost}
                        onChange={(e) => updateSetting(row.eventType, 'autoPost', e.target.checked)}
                        disabled={!row.isEnabled}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F] h-4 w-4 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <AccountCodeSelector
                        value={row.defaultDebitAccount || ''}
                        onChange={(value: string) => updateSetting(row.eventType, 'defaultDebitAccount', value || null)}
                        disabled={!row.isEnabled}
                        placeholder="Default..."
                        className="text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <AccountCodeSelector
                        value={row.defaultCreditAccount || ''}
                        onChange={(value: string) => updateSetting(row.eventType, 'defaultCreditAccount', value || null)}
                        disabled={!row.isEnabled}
                        placeholder="Default..."
                        className="text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Enabled:</strong> When unchecked, events of this type will not generate journal entries.</p>
            <p><strong>Auto-Post:</strong> When checked, generated journal entries will be automatically posted instead of created as drafts.</p>
            <p><strong>Default Accounts:</strong> Pre-fill account codes when the source document doesn&apos;t specify one. Leave empty to use system defaults.</p>
          </div>
        </>
      )}
    </div>
  );
}
