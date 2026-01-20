"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { Building2, Search, Download, Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import { Company } from "@/data/company/types";
import { companiesApi } from "@/lib/supabase/api";
import { dbCompanyToFrontend, frontendCompanyToDb } from "@/lib/supabase/transforms";
import { CompanyFormModal } from "@/components/company/CompanyFormModal";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Fetch companies from Supabase
  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await companiesApi.getAll();
      setCompanies(data.map(dbCompanyToFrontend));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filter and search companies
  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter((c) => c.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((c) => !c.isActive);
    }

    // Search by name or tax ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.taxId.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [companies, searchQuery, filterStatus]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this company?")) {
      try {
        await companiesApi.delete(id);
        await fetchCompanies();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete company');
      }
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsFormModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCompany(null);
    setIsFormModalOpen(true);
  };

  const handleSave = async (companyData: Partial<Company>) => {
    try {
      const dbData = frontendCompanyToDb(companyData);
      if (editingCompany) {
        await companiesApi.update(editingCompany.id, dbData);
      } else {
        await companiesApi.create(dbData);
      }
      await fetchCompanies();
    } catch (e) {
      throw e; // Let the modal handle the error
    }
  };

  const handleExportCSV = () => {
    const headers = ["Company Name", "Tax ID", "Contact", "Email", "Phone", "Status"];
    const rows = filteredCompanies.map(c => [
      c.name,
      c.taxId,
      c.contactInformation.primaryContactName,
      c.contactInformation.email,
      c.contactInformation.phoneNumber,
      c.isActive ? "Active" : "Inactive",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `companies-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-[#5A7A8F]" />
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage your sub-companies and organizations
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full items-start md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name or tax ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
            >
              <option value="all">All Companies</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredCompanies.length} of {companies.length} companies
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tax ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Primary Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading companies...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No companies found. {searchQuery && "Try adjusting your search criteria."}
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          <div className="text-xs text-gray-500">{company.registeredAddress.city}, {company.registeredAddress.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{company.taxId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.contactInformation.primaryContactName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{company.contactInformation.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{company.contactInformation.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {company.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(company)}
                          className="inline-flex items-center gap-1 text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                          title="Edit company"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 transition-colors"
                          title="Delete company"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Form Modal */}
      <CompanyFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSave}
        editingCompany={editingCompany}
      />
    </AppShell>
  );
}
