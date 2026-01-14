"use client";

import { useState, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { companiesApi, projectsApi } from "@/lib/supabase/api";
import {
  PriorYearImportData,
  ProjectPLData,
  createPriorYearJournalEntries,
  validatePriorYearData,
  calculateProjectTotals,
  calculateProjectNetProfit,
  getDefaultEffectiveDate,
} from "@/lib/accounting/priorYearImport";

interface CompanyOption {
  id: string;
  name: string;
}

interface ImportPriorYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportPriorYearModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportPriorYearModalProps) {
  const currentYear = new Date().getFullYear();

  // Data loading state
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Form state
  const [fiscalYear, setFiscalYear] = useState(currentYear - 1);
  const [companyId, setCompanyId] = useState("");
  const [projectsData, setProjectsData] = useState<ProjectPLData[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(
    getDefaultEffectiveDate(currentYear - 1)
  );
  const [notes, setNotes] = useState("");

  // UI state
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [entriesCreated, setEntriesCreated] = useState(0);

  // Load companies on mount
  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await companiesApi.getAll();
      setCompanies(data.map(c => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error("Failed to load companies:", error);
      setErrors(["Failed to load companies"]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Update effective date when fiscal year changes
  useEffect(() => {
    setEffectiveDate(getDefaultEffectiveDate(fiscalYear));
  }, [fiscalYear]);

  // Load projects when company changes
  useEffect(() => {
    if (companyId) {
      loadProjects(companyId);
    } else {
      setProjectsData([]);
    }
  }, [companyId]);

  const loadProjects = async (selectedCompanyId: string) => {
    setLoadingProjects(true);
    try {
      const data = await projectsApi.getByCompany(selectedCompanyId);
      setProjectsData(
        data.map((p) => ({
          projectId: p.id,
          projectName: p.name,
          totalIncome: 0,
          totalExpenses: 0,
          managementFees: 0,
        }))
      );
    } catch (error) {
      console.error("Failed to load projects:", error);
      setErrors(["Failed to load projects"]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Calculate totals
  const totals = calculateProjectTotals(projectsData);

  // Generate fiscal year options (last 10 years)
  const fiscalYearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 1 - i);

  const handleProjectDataChange = (
    index: number,
    field: "totalIncome" | "totalExpenses" | "managementFees",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setProjectsData((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: numValue } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    const data: PriorYearImportData = {
      fiscalYear,
      companyId,
      effectiveDate,
      projects: projectsData,
      notes: notes || undefined,
    };

    // Validate
    const validationErrors = validatePriorYearData(data);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Create journal entries for all projects
      const entries = createPriorYearJournalEntries(data, "super-admin");
      setEntriesCreated(entries.length);
      setShowSuccess(true);

      // Reset form after short delay
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Failed to import data"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFiscalYear(currentYear - 1);
    setCompanyId("");
    setProjectsData([]);
    setEffectiveDate(getDefaultEffectiveDate(currentYear - 1));
    setNotes("");
    setErrors([]);
    setEntriesCreated(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl transform rounded-xl bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Import Prior Year Data
              </h2>
              <p className="text-sm text-gray-500">
                Import P&L summary data for each project from a previous fiscal year
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span>
                Prior year data imported successfully! Created {entriesCreated} journal{" "}
                {entriesCreated === 1 ? "entry" : "entries"}.
              </span>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  {errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Fiscal Year & Company */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fiscal Year
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {fiscalYearOptions.map((year) => (
                    <option key={year} value={year}>
                      FY {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={loadingCompanies}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingCompanies ? "Loading companies..." : "Select company..."}
                  </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Projects Table */}
            {companyId && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">
                    Projects Summary for FY{fiscalYear}
                  </h3>
                </div>

                {loadingProjects ? (
                  <div className="p-8 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading projects...
                  </div>
                ) : projectsData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No projects found for this company
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Income (THB)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expenses (THB)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mgmt Fees (THB)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Net Profit (THB)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {projectsData.map((project, index) => {
                          const netProfit = calculateProjectNetProfit(project);
                          return (
                            <tr key={project.projectId}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {project.projectName}
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={project.totalIncome || ""}
                                  onChange={(e) =>
                                    handleProjectDataChange(index, "totalIncome", e.target.value)
                                  }
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={project.totalExpenses || ""}
                                  onChange={(e) =>
                                    handleProjectDataChange(index, "totalExpenses", e.target.value)
                                  }
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={project.managementFees || ""}
                                  onChange={(e) =>
                                    handleProjectDataChange(index, "managementFees", e.target.value)
                                  }
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                <span
                                  className={`font-semibold ${
                                    netProfit >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {netProfit < 0 && "-"}
                                  {formatCurrency(Math.abs(netProfit))}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr className="font-semibold">
                          <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(totals.totalIncome)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(totals.totalExpenses)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(totals.totalMgmtFees)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={`${
                                totals.totalNetProfit >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {totals.totalNetProfit < 0 && "-"}
                              {formatCurrency(Math.abs(totals.totalNetProfit))}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Effective Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Usually the last day of the fiscal year (Dec 31)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-700">
                This will create one journal entry per project to record prior year retained
                earnings. Projects with zero net profit will be skipped. Each entry will be
                automatically posted and appear in the Balance Sheet under Equity.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || showSuccess || projectsData.length === 0 || loadingProjects}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {isSubmitting ? "Importing..." : "Import All Projects"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
