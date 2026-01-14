"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import type { PettyCashWallet, WalletStatus } from "@/data/petty-cash/types";
import type { Currency, Company } from "@/data/company/types";
import { companiesApi } from "@/lib/supabase/api/companies";
import { pettyCashApi } from "@/lib/supabase/api/pettyCash";
import { dbCompanyToFrontend } from "@/lib/supabase/transforms";

interface WalletFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingWallet?: PettyCashWallet | null;
}

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "THB", label: "THB - Thai Baht" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AED", label: "AED - UAE Dirham" },
];

const STATUS_OPTIONS: { value: WalletStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

export function WalletFormModal({
  isOpen,
  onClose,
  onSave,
  editingWallet,
}: WalletFormModalProps) {
  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [walletName, setWalletName] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [currency, setCurrency] = useState<Currency>("THB");
  const [beginningBalance, setBeginningBalance] = useState("");
  const [balanceLimit, setBalanceLimit] = useState("");
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState("");
  const [status, setStatus] = useState<WalletStatus>("active");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const companiesData = await companiesApi.getActive();
        setCompanies(companiesData.map(dbCompanyToFrontend));
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCompanies();
  }, [isOpen]);

  // Get company name for the selected company
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === companyId);
  }, [companies, companyId]);

  // Initialize form with editing wallet data
  useEffect(() => {
    if (editingWallet) {
      setWalletName(editingWallet.walletName);
      setUserName(editingWallet.userName);
      setUserEmail(editingWallet.userEmail || "");
      setUserRole(editingWallet.userRole || "");
      setCompanyId(editingWallet.companyId);
      setCurrency(editingWallet.currency);
      setBeginningBalance(editingWallet.beginningBalance?.toString() || "");
      setBalanceLimit(editingWallet.balanceLimit?.toString() || "");
      setLowBalanceThreshold(editingWallet.lowBalanceThreshold?.toString() || "");
      setStatus(editingWallet.status);
    } else {
      // Reset form for new wallet
      setWalletName("");
      setUserName("");
      setUserEmail("");
      setUserRole("");
      setCompanyId(companies[0]?.id || "");
      setCurrency("THB");
      setBeginningBalance("");
      setBalanceLimit("");
      setLowBalanceThreshold("");
      setStatus("active");
    }
    setErrors({});
  }, [editingWallet, isOpen, companies]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Wallet name validation
    if (!walletName.trim()) {
      newErrors.walletName = "Wallet name is required";
    } else if (walletName.length > 50) {
      newErrors.walletName = "Wallet name must be 50 characters or less";
    }

    // Holder name validation
    if (!userName.trim()) {
      newErrors.userName = "Holder name is required";
    }

    // Email validation
    if (userEmail && !validateEmail(userEmail)) {
      newErrors.userEmail = "Invalid email format";
    }

    // Company validation
    if (!companyId) {
      newErrors.companyId = "Company is required";
    }

    // Beginning balance validation
    if (beginningBalance) {
      const balance = parseFloat(beginningBalance);
      if (isNaN(balance) || balance < 0) {
        newErrors.beginningBalance = "Beginning balance must be 0 or greater";
      }
    }

    // Balance limit validation
    if (balanceLimit) {
      const limit = parseFloat(balanceLimit);
      if (isNaN(limit) || limit <= 0) {
        newErrors.balanceLimit = "Balance limit must be greater than 0";
      }
    }

    // Low balance threshold validation
    if (lowBalanceThreshold) {
      const threshold = parseFloat(lowBalanceThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        newErrors.lowBalanceThreshold = "Threshold must be greater than 0";
      }

      // Threshold should be less than balance limit
      if (balanceLimit) {
        const limit = parseFloat(balanceLimit);
        if (!isNaN(limit) && threshold >= limit) {
          newErrors.lowBalanceThreshold = "Threshold must be less than balance limit";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingWallet) {
        // Update existing wallet
        await pettyCashApi.updateWallet(editingWallet.id, {
          wallet_name: walletName,
          user_name: userName,
          company_id: companyId,
          currency,
          balance_limit: balanceLimit ? parseFloat(balanceLimit) : null,
          low_balance_threshold: lowBalanceThreshold ? parseFloat(lowBalanceThreshold) : null,
          status,
        });
      } else {
        // Create new wallet
        await pettyCashApi.createWallet({
          wallet_name: walletName,
          user_name: userName,
          company_id: companyId,
          balance: beginningBalance ? parseFloat(beginningBalance) : 0,
          currency,
          balance_limit: balanceLimit ? parseFloat(balanceLimit) : null,
          low_balance_threshold: lowBalanceThreshold ? parseFloat(lowBalanceThreshold) : null,
          status: 'active',
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save wallet:', error);
      setErrors({ submit: 'Failed to save wallet. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingWallet ? "Edit Wallet" : "Add New Wallet"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
            {/* Wallet Name */}
            <div>
              <label htmlFor="walletName" className="block text-sm font-medium text-gray-700 mb-1">
                Wallet Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="walletName"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                  errors.walletName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Ocean Star Petty Cash"
              />
              {errors.walletName && <p className="mt-1 text-sm text-red-600">{errors.walletName}</p>}
            </div>

            {/* Holder Name */}
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                  errors.userName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., John Smith"
              />
              {errors.userName && <p className="mt-1 text-sm text-red-600">{errors.userName}</p>}
            </div>

            {/* User Email */}
            <div>
              <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
                User Email
              </label>
              <input
                type="email"
                id="userEmail"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                  errors.userEmail ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="email@example.com"
              />
              {errors.userEmail && <p className="mt-1 text-sm text-red-600">{errors.userEmail}</p>}
            </div>

            {/* User Role */}
            <div>
              <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                id="userRole"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                placeholder="e.g., Captain - Ocean Star"
              />
            </div>

            {/* Company */}
            <div>
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <select
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                  errors.companyId ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {errors.companyId && <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>}
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                disabled={!!editingWallet} // Cannot change currency after creation
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                  editingWallet ? "bg-gray-100 text-gray-500" : ""
                }`}
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {editingWallet && (
                <p className="mt-1 text-xs text-gray-500">Currency cannot be changed after creation</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2" />

            {/* Beginning Balance (only for new wallets) */}
            {!editingWallet && (
              <div>
                <label htmlFor="beginningBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  Beginning Balance
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="beginningBalance"
                    value={beginningBalance}
                    onChange={(e) => setBeginningBalance(e.target.value)}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent pr-16 ${
                      errors.beginningBalance ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {currency}
                  </span>
                </div>
                {errors.beginningBalance && (
                  <p className="mt-1 text-sm text-red-600">{errors.beginningBalance}</p>
                )}
              </div>
            )}

            {/* Balance Limit */}
            <div>
              <label htmlFor="balanceLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Balance Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="balanceLimit"
                  value={balanceLimit}
                  onChange={(e) => setBalanceLimit(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent pr-16 ${
                    errors.balanceLimit ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., 50000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {currency}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Maximum allowed balance in this wallet</p>
              {errors.balanceLimit && <p className="mt-1 text-sm text-red-600">{errors.balanceLimit}</p>}
            </div>

            {/* Low Balance Threshold */}
            <div>
              <label htmlFor="lowBalanceThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                Low Balance Alert Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="lowBalanceThreshold"
                  value={lowBalanceThreshold}
                  onChange={(e) => setLowBalanceThreshold(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent pr-16 ${
                    errors.lowBalanceThreshold ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g., 5000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {currency}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Alert when balance falls below this amount</p>
              {errors.lowBalanceThreshold && (
                <p className="mt-1 text-sm text-red-600">{errors.lowBalanceThreshold}</p>
              )}
            </div>

            {/* Status (only for editing) */}
            {editingWallet && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WalletStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
            >
              {editingWallet ? "Update Wallet" : "Create Wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
