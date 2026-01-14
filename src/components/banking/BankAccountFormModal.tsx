"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { BankAccount, BankInformation } from "@/data/banking/types";
import { Currency, Company } from "@/data/company/types";
import { companiesApi, bankAccountsApi } from "@/lib/supabase/api";
import { dbCompanyToFrontend, frontendBankAccountToDb } from "@/lib/supabase/transforms";

interface BankAccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingBankAccount?: BankAccount | null;
  selectedCompanyId: string;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const emptyBankInfo: BankInformation = {
  bankName: "",
  bankBranch: "",
  bankCountry: "",
  swiftBic: "",
};

// GL Account to Currency mapping
const glCurrencyMap: Record<string, Currency> = {
  '1010': 'THB',
  '1011': 'EUR',
  '1012': 'USD',
  '1013': 'SGD',
};

// Bank account GL codes
const bankGLAccounts = [
  { code: '1010', name: 'Bank Account THB', currency: 'THB' },
  { code: '1011', name: 'Bank Account EUR', currency: 'EUR' },
  { code: '1012', name: 'Bank Account USD', currency: 'USD' },
  { code: '1013', name: 'Bank Account SGD', currency: 'SGD' },
];

export function BankAccountFormModal({
  isOpen,
  onClose,
  onSave,
  editingBankAccount,
  selectedCompanyId,
  onToggleStatus,
  onDelete,
}: BankAccountFormModalProps) {
  const [bankInformation, setBankInformation] = useState<BankInformation>(emptyBankInfo);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [currency, setCurrency] = useState<Currency>("THB");
  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [glAccountCode, setGlAccountCode] = useState("1010");
  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [openingBalanceDate, setOpeningBalanceDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const data = await companiesApi.getAll();
        setCompanies(data.map(dbCompanyToFrontend));
      } catch (e) {
        console.error('Failed to fetch companies:', e);
      } finally {
        setLoadingCompanies(false);
      }
    };
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter GL accounts by selected currency
  const availableGLAccounts = useMemo(() => {
    return bankGLAccounts.filter(gl => gl.currency === currency);
  }, [currency]);

  // Initialize form with editing bank account data
  useEffect(() => {
    if (editingBankAccount) {
      setBankInformation(editingBankAccount.bankInformation);
      setAccountName(editingBankAccount.accountName);
      setAccountNumber(editingBankAccount.accountNumber);
      setIban(editingBankAccount.iban || "");
      setCurrency(editingBankAccount.currency);
      setCompanyId(editingBankAccount.companyId);
      setGlAccountCode(editingBankAccount.glAccountCode);
      setOpeningBalance(editingBankAccount.openingBalance.toString());
      setOpeningBalanceDate(editingBankAccount.openingBalanceDate);
      setIsActive(editingBankAccount.isActive);
    } else {
      // Reset form for new bank account
      setBankInformation(emptyBankInfo);
      setAccountName("");
      setAccountNumber("");
      setIban("");
      setCurrency("THB");
      // If selectedCompanyId is "all" or empty, use the first available company
      const validCompanyId = selectedCompanyId && selectedCompanyId !== 'all'
        ? selectedCompanyId
        : (companies.length > 0 ? companies[0].id : '');
      setCompanyId(validCompanyId);
      setGlAccountCode("1010");
      setOpeningBalance("0");
      setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
      setIsActive(true);
    }
    setErrors({});
  }, [editingBankAccount, isOpen, selectedCompanyId, companies]);

  // Fix companyId when it's "all" and companies are loaded
  useEffect(() => {
    if (!editingBankAccount && (companyId === 'all' || !companyId) && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId, editingBankAccount]);

  // Auto-update GL account when currency changes (only for new accounts)
  useEffect(() => {
    if (!editingBankAccount) {
      const matchingGL = bankGLAccounts.find(gl => gl.currency === currency);
      if (matchingGL) {
        setGlAccountCode(matchingGL.code);
      }
    }
  }, [currency, editingBankAccount]);

  // Validation functions
  const validateSwiftBic = (swift: string): boolean => {
    if (!swift) return true; // Optional field
    const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return swiftRegex.test(swift.toUpperCase());
  };

  const validateIban = (ibanValue: string): boolean => {
    if (!ibanValue) return true; // Optional field
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    const clean = ibanValue.replace(/\s/g, '').toUpperCase();
    return clean.length >= 15 && clean.length <= 34 && ibanRegex.test(clean);
  };

  const validateCurrencyGLMatch = (curr: Currency, glCode: string): boolean => {
    return glCurrencyMap[glCode] === curr;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Bank Information validation
    if (!bankInformation.bankName.trim()) {
      newErrors.bankName = "Bank name is required";
    }
    if (!bankInformation.bankCountry.trim()) {
      newErrors.bankCountry = "Bank country is required";
    }
    if (bankInformation.swiftBic && !validateSwiftBic(bankInformation.swiftBic)) {
      newErrors.swiftBic = "SWIFT/BIC must be 8 or 11 characters (e.g., BKKBTHBK)";
    }

    // Account Information validation
    if (!accountName.trim()) {
      newErrors.accountName = "Account name is required";
    }
    if (!accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required";
    }
    if (iban && !validateIban(iban)) {
      newErrors.iban = "Invalid IBAN format (15-34 characters, starts with country code)";
    }
    if (!companyId || companyId === 'all') {
      newErrors.companyId = "Please select a specific company";
    }

    // Accounting Details validation
    if (!glAccountCode) {
      newErrors.glAccountCode = "GL account is required";
    }
    if (!validateCurrencyGLMatch(currency, glAccountCode)) {
      newErrors.glAccountCode = "GL account currency must match selected currency";
    }
    if (openingBalance === "" || isNaN(parseFloat(openingBalance))) {
      newErrors.openingBalance = "Opening balance must be a valid number";
    }
    if (!openingBalanceDate) {
      newErrors.openingBalanceDate = "Opening balance date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleActiveStatusChange = (checked: boolean) => {
    const action = checked ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${action} this bank account?`;

    if (confirm(confirmMessage)) {
      setIsActive(checked);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const bankAccountData: Partial<BankAccount> = {
      bankInformation: {
        bankName: bankInformation.bankName,
        bankBranch: bankInformation.bankBranch || undefined,
        bankCountry: bankInformation.bankCountry,
        swiftBic: bankInformation.swiftBic || undefined,
      },
      accountName,
      accountNumber,
      iban: iban || undefined,
      currency,
      companyId,
      glAccountCode,
      openingBalance: parseFloat(openingBalance),
      openingBalanceDate,
      isActive,
    };

    setSaving(true);
    try {
      const dbData = frontendBankAccountToDb(bankAccountData);
      console.log('Saving bank account data:', dbData);
      if (editingBankAccount) {
        await bankAccountsApi.update(editingBankAccount.id, dbData);
      } else {
        await bankAccountsApi.create(dbData);
      }
      onSave();
      onClose();
    } catch (e: unknown) {
      console.error('Failed to save bank account:', e);
      // Extract detailed error message from Supabase error
      let errorMessage = 'Failed to save bank account';
      if (e && typeof e === 'object') {
        const err = e as { message?: string; details?: string; hint?: string; code?: string };
        if (err.message) errorMessage = err.message;
        if (err.details) errorMessage += ` - ${err.details}`;
        if (err.hint) errorMessage += ` (Hint: ${err.hint})`;
        console.error('Error details:', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      }
      setErrors({ save: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingBankAccount ? "Edit Bank Account" : "Add New Bank Account"}
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
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {/* Bank Information Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="bankName"
                    value={bankInformation.bankName}
                    onChange={(e) =>
                      setBankInformation({ ...bankInformation, bankName: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.bankName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., Bangkok Bank, DBS Bank"
                  />
                  {errors.bankName && <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>}
                </div>

                <div>
                  <label htmlFor="bankBranch" className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Branch
                  </label>
                  <input
                    type="text"
                    id="bankBranch"
                    value={bankInformation.bankBranch || ''}
                    onChange={(e) =>
                      setBankInformation({ ...bankInformation, bankBranch: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                    placeholder="e.g., Phuket Branch, Main Branch"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bankCountry" className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="bankCountry"
                      value={bankInformation.bankCountry}
                      onChange={(e) =>
                        setBankInformation({ ...bankInformation, bankCountry: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                        errors.bankCountry ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="e.g., Thailand, Singapore"
                    />
                    {errors.bankCountry && (
                      <p className="mt-1 text-sm text-red-600">{errors.bankCountry}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="swiftBic" className="block text-sm font-medium text-gray-700 mb-1">
                      SWIFT/BIC Code
                    </label>
                    <input
                      type="text"
                      id="swiftBic"
                      value={bankInformation.swiftBic || ''}
                      onChange={(e) =>
                        setBankInformation({
                          ...bankInformation,
                          swiftBic: e.target.value.toUpperCase(),
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                        errors.swiftBic ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="e.g., BKKBTHBK"
                      maxLength={11}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional. 8 or 11 characters for international transfers
                    </p>
                    {errors.swiftBic && <p className="mt-1 text-sm text-red-600">{errors.swiftBic}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.accountName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., Operating Account, USD Reserve"
                  />
                  {errors.accountName && (
                    <p className="mt-1 text-sm text-red-600">{errors.accountName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.accountNumber ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., 123-4-56789-0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Stored as text to preserve leading zeros and country formats
                  </p>
                  {errors.accountNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.iban ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., SG12001234567890"
                    maxLength={34}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional. Country-dependent international bank account number
                  </p>
                  {errors.iban && <p className="mt-1 text-sm text-red-600">{errors.iban}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
                    >
                      <option value="THB">THB - Thai Baht</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                    </select>
                  </div>

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
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    {errors.companyId && (
                      <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting Details Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Accounting Details</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="glAccountCode" className="block text-sm font-medium text-gray-700 mb-1">
                    General Ledger Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="glAccountCode"
                    value={glAccountCode}
                    onChange={(e) => setGlAccountCode(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                      errors.glAccountCode ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    {availableGLAccounts.map((gl) => (
                      <option key={gl.code} value={gl.code}>
                        {gl.code} - {gl.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    GL account is filtered by selected currency
                  </p>
                  {errors.glAccountCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.glAccountCode}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Balance <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="openingBalance"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                        errors.openingBalance ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-xs text-gray-500">Can be negative. Always editable.</p>
                    {errors.openingBalance && (
                      <p className="mt-1 text-sm text-red-600">{errors.openingBalance}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="openingBalanceDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Balance Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="openingBalanceDate"
                      value={openingBalanceDate}
                      onChange={(e) => setOpeningBalanceDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
                        errors.openingBalanceDate ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.openingBalanceDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.openingBalanceDate}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => handleActiveStatusChange(e.target.checked)}
                    className="h-4 w-4 text-[#5A7A8F] focus:ring-[#5A7A8F] border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active Account
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Error Display */}
          {errors.save && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.save}</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
            <div className="flex items-center gap-3">
              {editingBankAccount && onToggleStatus && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleStatus(editingBankAccount.id);
                    onClose();
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {editingBankAccount.isActive ? 'Deactivate' : 'Activate'}
                </button>
              )}
              {editingBankAccount && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingBankAccount.id);
                    onClose();
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loadingCompanies}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingBankAccount ? "Update Bank Account" : "Create Bank Account"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
