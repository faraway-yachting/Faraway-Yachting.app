'use client';

import { X } from 'lucide-react';
import type { Project } from '@/data/project/types';
import type { Company } from '@/data/company/types';

export interface FilterValues {
  dateFrom: string;
  dateTo: string;
  status: string;
  projectId: string;
  companyId: string;
}

interface ExpenseFiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: Partial<FilterValues>) => void;
  onClear: () => void;
  statusOptions: { value: string; label: string }[];
  projects: Project[];
  companies: Company[];
  statusLabel?: string;
}

export default function ExpenseFilters({
  filters,
  onFilterChange,
  onClear,
  statusOptions,
  projects,
  companies,
  statusLabel = 'Status',
}: ExpenseFiltersProps) {
  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.status ||
    filters.projectId ||
    filters.companyId;

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-end gap-3">
        {/* Date From */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            From
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          />
        </div>

        {/* Date To */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            To
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          />
        </div>

        {/* Status */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {statusLabel}
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          >
            <option value="">All</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Company */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Company
          </label>
          <select
            value={filters.companyId}
            onChange={(e) => onFilterChange({ companyId: e.target.value, projectId: '' })}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Project
          </label>
          <select
            value={filters.projectId}
            onChange={(e) => onFilterChange({ projectId: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Active filter count */}
      {hasActiveFilters && (
        <div className="mt-2 text-xs text-gray-500">
          {[
            filters.dateFrom && `From: ${filters.dateFrom}`,
            filters.dateTo && `To: ${filters.dateTo}`,
            filters.status && `${statusLabel}: ${statusOptions.find(o => o.value === filters.status)?.label || filters.status}`,
            filters.companyId && `Company: ${companies.find(c => c.id === filters.companyId)?.name || filters.companyId}`,
            filters.projectId && `Project: ${projects.find(p => p.id === filters.projectId)?.name || filters.projectId}`,
          ].filter(Boolean).join(' • ')}
        </div>
      )}
    </div>
  );
}
