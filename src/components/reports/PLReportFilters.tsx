"use client";

import { Currency } from "@/data/company/types";

interface PLReportFiltersProps {
  dateFrom: string;
  dateTo: string;
  companyId: string;
  projectId: string;
  showInTHB: boolean;
  companies: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onCompanyChange: (companyId: string) => void;
  onProjectChange: (projectId: string) => void;
  onShowInTHBChange: (showInTHB: boolean) => void;
  isLoadingFilters?: boolean;
}

export function PLReportFilters({
  dateFrom,
  dateTo,
  companyId,
  projectId,
  showInTHB,
  companies,
  projects,
  onDateFromChange,
  onDateToChange,
  onCompanyChange,
  onProjectChange,
  onShowInTHBChange,
  isLoadingFilters = false,
}: PLReportFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Period From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Period To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Company Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company
          </label>
          <select
            value={companyId}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={isLoadingFilters}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={isLoadingFilters}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => onShowInTHBChange(true)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                showInTHB
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              THB
            </button>
            <button
              onClick={() => onShowInTHBChange(false)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-l ${
                !showInTHB
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
