'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { projectsApi } from '@/lib/supabase/api/projects';
import { companiesApi } from '@/lib/supabase/api/companies';
import type { Database } from '@/lib/supabase/database.types';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectConfig {
  id: string;
  name: string;
  code: string;
  companyId: string;
  companyName: string;
  intercompanyFeeDayCharter: number | null;
  intercompanyFeeOvernight: number | null;
  intercompanyFeeCabin: number | null;
  intercompanyFeeOther: number | null;
  isDirty: boolean;
}

export default function ConfigurationTab() {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allProjects, allCompanies] = await Promise.all([
        projectsApi.getAll(),
        companiesApi.getAll(),
      ]);

      const companyMap = new Map(allCompanies.map((c) => [c.id, c.name]));

      setProjects(
        allProjects.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          companyId: p.company_id,
          companyName: companyMap.get(p.company_id) || 'Unknown',
          intercompanyFeeDayCharter: p.intercompany_fee_day_charter,
          intercompanyFeeOvernight: p.intercompany_fee_overnight,
          intercompanyFeeCabin: p.intercompany_fee_cabin,
          intercompanyFeeOther: p.intercompany_fee_other,
          isDirty: false,
        }))
      );
      // companies loaded for name mapping only
    } catch (error) {
      console.error('Failed to load intercompany configuration:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = (projectId: string, field: keyof ProjectConfig, value: unknown) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, [field]: value, isDirty: true } : p
      )
    );
  };

  const handleSave = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    try {
      setSaving(projectId);
      await projectsApi.update(projectId, {
        intercompany_fee_day_charter: project.intercompanyFeeDayCharter,
        intercompany_fee_overnight: project.intercompanyFeeOvernight,
        intercompany_fee_cabin: project.intercompanyFeeCabin,
        intercompany_fee_other: project.intercompanyFeeOther,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, isDirty: false } : p))
      );
      setSaveSuccess(projectId);
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (error) {
      console.error('Failed to save intercompany config:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const parseNumber = (value: string): number | null => {
    if (!value || value.trim() === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Configure which company owns each boat and the fixed charter fees to be paid per charter type.
        If &quot;Owner Company&quot; differs from &quot;Registered Company&quot;, intercompany fees will be tracked automatically.
      </p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Boat / Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day Charter Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overnight Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cabin Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other Fee
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                  <tr
                    key={project.id}
                    className={`hover:bg-gray-50 ${project.isDirty ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500">{project.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {project.companyName}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={project.intercompanyFeeDayCharter ?? ''}
                        onChange={(e) =>
                          handleUpdate(project.id, 'intercompanyFeeDayCharter', parseNumber(e.target.value))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={project.intercompanyFeeOvernight ?? ''}
                        onChange={(e) =>
                          handleUpdate(project.id, 'intercompanyFeeOvernight', parseNumber(e.target.value))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={project.intercompanyFeeCabin ?? ''}
                        onChange={(e) =>
                          handleUpdate(project.id, 'intercompanyFeeCabin', parseNumber(e.target.value))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={project.intercompanyFeeOther ?? ''}
                        onChange={(e) =>
                          handleUpdate(project.id, 'intercompanyFeeOther', parseNumber(e.target.value))
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {project.isDirty && (
                        <button
                          onClick={() => handleSave(project.id)}
                          disabled={saving === project.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-[#5A7A8F] rounded hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
                        >
                          {saving === project.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Save
                        </button>
                      )}
                      {saveSuccess === project.id && (
                        <span className="text-xs text-green-600 font-medium">Saved</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Configure charter fees per boat. When a receipt is paid to a company that doesn&apos;t own the boat,
          the system will use these fees to estimate the intercompany transfer amount. This does not affect project P&amp;L.
        </p>
      </div>
    </div>
  );
}
