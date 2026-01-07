"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { chartOfAccounts, ChartOfAccount, AccountType } from "@/data/accounting/chartOfAccounts";
import { Search, Download, ChevronUp, ChevronDown, BookOpen, Edit2, X } from "lucide-react";

export default function ChartOfAccountsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState<AccountType | "All">("All");
  const [filterSubType, setFilterSubType] = useState<string | "All">("All");
  const [filterCategory, setFilterCategory] = useState<string | "All">("All");
  const [filterBalance, setFilterBalance] = useState<"Debit" | "Credit" | "All">("All");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ChartOfAccount;
    direction: "asc" | "desc";
  }>({ key: "code", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);

  // Get unique sub types and categories for filter dropdowns
  const uniqueSubTypes = useMemo(() => {
    const subTypes = new Set(chartOfAccounts.map(acc => acc.subType));
    return Array.from(subTypes).sort();
  }, []);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(chartOfAccounts.map(acc => acc.category));
    return Array.from(categories).sort();
  }, []);

  // Filter and search accounts
  const filteredAccounts = useMemo(() => {
    let filtered = chartOfAccounts;

    // Filter by code
    if (filterCode.trim()) {
      const query = filterCode.toLowerCase();
      filtered = filtered.filter((acc) => acc.code.toLowerCase().includes(query));
    }

    // Filter by name
    if (filterName.trim()) {
      const query = filterName.toLowerCase();
      filtered = filtered.filter((acc) => acc.name.toLowerCase().includes(query));
    }

    // Filter by type
    if (filterType !== "All") {
      filtered = filtered.filter((acc) => acc.accountType === filterType);
    }

    // Filter by sub type
    if (filterSubType !== "All") {
      filtered = filtered.filter((acc) => acc.subType === filterSubType);
    }

    // Filter by category
    if (filterCategory !== "All") {
      filtered = filtered.filter((acc) => acc.category === filterCategory);
    }

    // Filter by normal balance
    if (filterBalance !== "All") {
      filtered = filtered.filter((acc) => acc.normalBalance === filterBalance);
    }

    // Search by code or name (global search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (acc) =>
          acc.code.toLowerCase().includes(query) ||
          acc.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, filterCode, filterName, filterType, filterSubType, filterCategory, filterBalance]);

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredAccounts, sortConfig]);

  // Paginate
  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAccounts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAccounts, currentPage]);

  // Handle sort
  const handleSort = (key: keyof ChartOfAccount) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Account Code",
      "Account Name",
      "Account Type",
      "Sub Type",
      "Category",
      "Normal Balance",
      "Description",
    ];

    const csvContent = [
      headers.join(","),
      ...sortedAccounts.map((acc) =>
        [
          acc.code,
          `"${acc.name}"`,
          acc.accountType,
          `"${acc.subType}"`,
          `"${acc.category}"`,
          acc.normalBalance,
          `"${acc.description}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "chart-of-accounts.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterCode("");
    setFilterName("");
    setFilterType("All");
    setFilterSubType("All");
    setFilterCategory("All");
    setFilterBalance("All");
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: keyof ChartOfAccount }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline-block ml-1" />
    );
  };

  return (
    <AppShell currentRole="manager">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-[#5A7A8F]" />
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
        </div>
        <p className="text-sm text-gray-500">
          Complete list of all general ledger accounts
        </p>
      </div>

      {/* Search and Export Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full items-start md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by account code or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || filterCode || filterName || filterType !== "All" || filterSubType !== "All" || filterCategory !== "All" || filterBalance !== "All") && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#2c3e50] transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {sortedAccounts.length} of {chartOfAccounts.length} accounts
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-4 border-r border-gray-200">
                  <div
                    onClick={() => handleSort("code")}
                    className="flex items-center justify-center text-xs font-bold text-gray-800 uppercase tracking-wide cursor-pointer hover:text-[#5A7A8F] select-none mb-3 whitespace-nowrap"
                  >
                    Account Code
                    <SortIcon column="code" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filterCode}
                    onChange={(e) => {
                      setFilterCode(e.target.value);
                      setCurrentPage(1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent placeholder:text-gray-400"
                  />
                </th>
                <th className="px-3 py-4 border-r border-gray-200">
                  <div
                    onClick={() => handleSort("name")}
                    className="flex items-center justify-center text-xs font-bold text-gray-800 uppercase tracking-wide cursor-pointer hover:text-[#5A7A8F] select-none mb-3"
                  >
                    Account Name
                    <SortIcon column="name" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filterName}
                    onChange={(e) => {
                      setFilterName(e.target.value);
                      setCurrentPage(1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent placeholder:text-gray-400"
                  />
                </th>
                <th className="px-3 py-4 border-r border-gray-200">
                  <div
                    onClick={() => handleSort("accountType")}
                    className="flex items-center justify-center text-xs font-bold text-gray-800 uppercase tracking-wide cursor-pointer hover:text-[#5A7A8F] select-none mb-3"
                  >
                    Type
                    <SortIcon column="accountType" />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as AccountType | "All");
                      setCurrentPage(1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent bg-white"
                  >
                    <option value="All">All</option>
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </th>
                <th className="px-3 py-4 border-r border-gray-200">
                  <div
                    onClick={() => handleSort("subType")}
                    className="flex items-center justify-center text-xs font-bold text-gray-800 uppercase tracking-wide cursor-pointer hover:text-[#5A7A8F] select-none mb-3"
                  >
                    Sub Type
                    <SortIcon column="subType" />
                  </div>
                  <select
                    value={filterSubType}
                    onChange={(e) => {
                      setFilterSubType(e.target.value);
                      setCurrentPage(1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent bg-white"
                  >
                    <option value="All">All</option>
                    {uniqueSubTypes.map((subType) => (
                      <option key={subType} value={subType}>
                        {subType}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-3 py-4 border-r border-gray-200">
                  <div
                    onClick={() => handleSort("category")}
                    className="flex items-center justify-center text-xs font-bold text-gray-800 uppercase tracking-wide cursor-pointer hover:text-[#5A7A8F] select-none mb-3"
                  >
                    Category
                    <SortIcon column="category" />
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent bg-white"
                  >
                    <option value="All">All</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-3 py-4 border-r border-gray-200">
                  <div
                    onClick={() => handleSort("normalBalance")}
                    className="flex items-center justify-center text-xs font-bold text-gray-800 uppercase tracking-wide cursor-pointer hover:text-[#5A7A8F] select-none mb-3 whitespace-nowrap"
                  >
                    Normal Balance
                    <SortIcon column="normalBalance" />
                  </div>
                  <select
                    value={filterBalance}
                    onChange={(e) => {
                      setFilterBalance(e.target.value as "Debit" | "Credit" | "All");
                      setCurrentPage(1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent bg-white"
                  >
                    <option value="All">All</option>
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </th>
                <th className="px-3 py-4 border-r border-gray-200 text-center text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Description
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAccounts.map((account, index) => (
                <tr
                  key={account.code}
                  className={`hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 whitespace-nowrap">
                    {account.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {account.name}
                    {account.currency && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {account.currency}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {account.accountType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {account.subType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {account.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        account.normalBalance === "Debit"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {account.normalBalance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {account.description}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditingAccount(account);
                        setIsEditModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Account</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Account Code (readonly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Code
                </label>
                <input
                  type="text"
                  value={editingAccount.code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={editingAccount.accountType}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      accountType: e.target.value as AccountType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>

              {/* Sub Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub Type
                </label>
                <input
                  type="text"
                  value={editingAccount.subType}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, subType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editingAccount.category}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                />
              </div>

              {/* Normal Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Normal Balance
                </label>
                <select
                  value={editingAccount.normalBalance}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      normalBalance: e.target.value as "Debit" | "Credit",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                >
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingAccount.description}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Save changes to backend or state
                  // For now, just close the modal (changes are lost)
                  setIsEditModalOpen(false);
                  // In a real app, you would update the chartOfAccounts data here
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
