"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/accounting/AppShell";
import { Settings as SettingsIcon, Building2, Users, Bell, CreditCard, Edit2, Anchor, FileText, Wallet, Trash2, Hash, Loader2, Upload, Zap, Calendar } from "lucide-react";
import { Company } from "@/data/company/types";
import { CompanyFormModal } from "@/components/company/CompanyFormModal";
import { companiesApi, projectsApi, bankAccountsApi } from "@/lib/supabase/api";
import {
  frontendCompanyToDb,
  dbCompanyToFrontend,
  dbProjectToFrontend,
  frontendProjectToDb,
  dbBankAccountToFrontend,
  frontendBankAccountToDb
} from "@/lib/supabase/transforms";
import { BankAccountFormModal } from "@/components/banking/BankAccountFormModal";
import { BankAccount } from "@/data/banking/types";
import { ProjectFormModal } from "@/components/project/ProjectFormModal";
import { Project } from "@/data/project/types";
import type { DocumentType, PdfFieldSettings, PdfSettings } from "@/data/settings/types";
import { pdfSettingsApi } from "@/lib/supabase/api/pdfSettings";
import { PdfPreviewPanel } from "@/components/settings/PdfPreviewPanel";
import { pettyCashApi } from "@/lib/supabase/api/pettyCash";
import type { PettyCashWallet } from "@/data/petty-cash/types";
import { WalletFormModal } from "@/components/petty-cash/WalletFormModal";
import { NumberFormatSettings } from "@/components/settings/NumberFormatSettings";
import { UserManagementModal } from "@/components/settings/UserManagementModal";
import { ImportPriorYearModal } from "@/components/accounting/ImportPriorYearModal";
import { JournalEventSettings } from "@/components/accounting/JournalEventSettings";
import { beamMerchantAccountsApi } from "@/lib/supabase/api/beamMerchantAccounts";
import type { BeamMerchantAccount } from "@/data/beam/types";
import { financialPeriodsApi } from "@/lib/supabase/api/financialPeriods";
import type { FinancialPeriod } from "@/lib/supabase/api/financialPeriods";

export default function SettingsPage() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Company state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showInactiveCompanies, setShowInactiveCompanies] = useState(true);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const filteredCompanies = showInactiveCompanies
    ? companies
    : companies.filter(c => c.isActive);

  // Bank account state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [showInactiveBankAccounts, setShowInactiveBankAccounts] = useState(true);

  const filteredBankAccounts = showInactiveBankAccounts
    ? bankAccounts
    : bankAccounts.filter(ba => ba.isActive);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showInactiveProjects, setShowInactiveProjects] = useState(true);

  const filteredProjects = showInactiveProjects
    ? projects
    : projects.filter(p => p.status === 'active');

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [companiesData, projectsData, walletsData, gatewaysData] = await Promise.all([
          companiesApi.getAll(),
          projectsApi.getAll(),
          pettyCashApi.getAllWallets(),
          beamMerchantAccountsApi.getAll(),
        ]);
        const transformedCompanies = companiesData.map(dbCompanyToFrontend);
        setCompanies(transformedCompanies);
        setProjects(projectsData.map(dbProjectToFrontend));

        // Transform wallets from DB format to frontend format
        setWallets(walletsData.map(w => ({
          id: w.id,
          walletName: w.wallet_name,
          userId: w.user_id || '',
          userName: w.user_name,
          companyId: w.company_id,
          companyName: transformedCompanies.find(c => c.id === w.company_id)?.name || 'Unknown',
          balance: w.balance,
          beginningBalance: w.balance, // DB doesn't have separate beginning balance
          currency: w.currency as PettyCashWallet['currency'],
          status: w.status as PettyCashWallet['status'],
          balanceLimit: w.balance_limit || undefined,
          lowBalanceThreshold: w.low_balance_threshold || undefined,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        })));

        setGateways(gatewaysData);

        // Set initial selected company to "all" to show all bank accounts
        if (!selectedCompanyId) {
          setSelectedCompanyId('all');
        }

        // Load PDF settings from database
        const pdfData = await pdfSettingsApi.get();
        setAllPdfSettings(pdfData);
        // Initialize local state with quotation settings (default selected type)
        setPdfFields(pdfData.quotation.fields);
        setDefaultTerms(pdfData.quotation.defaultTermsAndConditions);
        setDefaultValidityDays(pdfData.quotation.defaultValidityDays ?? 2);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch bank accounts when selected company changes
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!selectedCompanyId) {
        setBankAccounts([]);
        return;
      }
      try {
        let bankAccountsData;
        if (selectedCompanyId === 'all') {
          bankAccountsData = await bankAccountsApi.getAll();
        } else {
          bankAccountsData = await bankAccountsApi.getByCompany(selectedCompanyId);
        }
        setBankAccounts(bankAccountsData.map(dbBankAccountToFrontend));
      } catch (e) {
        console.error('Failed to fetch bank accounts:', e);
      }
    };
    fetchBankAccounts();
  }, [selectedCompanyId]);

  // Wallet state
  const [wallets, setWallets] = useState<PettyCashWallet[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<PettyCashWallet | null>(null);
  const [showClosedWallets, setShowClosedWallets] = useState(false);

  const filteredWallets = showClosedWallets
    ? wallets
    : wallets.filter(w => w.status === 'active');

  // Payment Gateway state
  const [gateways, setGateways] = useState<Array<{
    id: string;
    merchant_id: string;
    merchant_name: string;
    company_id: string;
    settlement_bank_account_id: string | null;
    is_active: boolean;
    notes: string | null;
    company?: { id: string; name: string } | null;
  }>>([]);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<typeof gateways[0] | null>(null);
  const [gatewayForm, setGatewayForm] = useState({
    merchant_id: '',
    merchant_name: '',
    company_id: '',
    settlement_bank_account_id: '',
    is_active: true,
    notes: '',
  });
  const [gatewaySaving, setGatewaySaving] = useState(false);

  // User Management state
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);

  // Import Prior Year state
  const [isImportPriorYearModalOpen, setIsImportPriorYearModalOpen] = useState(false);

  // Financial Periods state
  const [fpCompanyId, setFpCompanyId] = useState<string>("");
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpActionLoading, setFpActionLoading] = useState<string | null>(null);

  // Generate last 24 months + current month period strings
  const generatePeriodStrings = (): string[] => {
    const periods: string[] = [];
    const now = new Date();
    for (let i = 0; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return periods;
  };

  const allPeriodStrings = generatePeriodStrings();

  // Fetch financial periods when company changes
  useEffect(() => {
    const fetchFinancialPeriods = async () => {
      if (!fpCompanyId) {
        setFinancialPeriods([]);
        return;
      }
      setFpLoading(true);
      try {
        const data = await financialPeriodsApi.getAll(fpCompanyId);
        setFinancialPeriods(data);
      } catch (e) {
        console.error('Failed to fetch financial periods:', e);
      } finally {
        setFpLoading(false);
      }
    };
    fetchFinancialPeriods();
  }, [fpCompanyId]);

  const refreshFinancialPeriods = async () => {
    if (!fpCompanyId) return;
    try {
      const data = await financialPeriodsApi.getAll(fpCompanyId);
      setFinancialPeriods(data);
    } catch (e) {
      console.error('Failed to refresh financial periods:', e);
    }
  };

  const handleClosePeriod = async (period: string) => {
    if (!fpCompanyId) return;
    setFpActionLoading(period);
    try {
      // Use a placeholder userId - in production this would come from auth context
      await financialPeriodsApi.closePeriod(fpCompanyId, period, 'current-user');
      await refreshFinancialPeriods();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to close period');
    } finally {
      setFpActionLoading(null);
    }
  };

  const handleReopenPeriod = async (period: string) => {
    if (!fpCompanyId) return;
    if (!confirm(`Are you sure you want to reopen period ${period}?`)) return;
    setFpActionLoading(period);
    try {
      await financialPeriodsApi.reopenPeriod(fpCompanyId, period);
      await refreshFinancialPeriods();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reopen period');
    } finally {
      setFpActionLoading(null);
    }
  };

  const getPeriodRecord = (period: string): FinancialPeriod | undefined => {
    return financialPeriods.find(fp => fp.period === period);
  };

  // PDF Settings state
  const [pdfDocumentType, setPdfDocumentType] = useState<DocumentType>('quotation');
  const [allPdfSettings, setAllPdfSettings] = useState<PdfSettings | null>(null);
  const [pdfFields, setPdfFields] = useState<PdfFieldSettings>({
    showCompanyAddress: true,
    showCompanyPhone: true,
    showCompanyEmail: true,
    showCompanyTaxId: true,
    showClientAddress: true,
    showClientEmail: true,
    showClientTaxId: false,
    showValidUntil: true,
    showVatColumn: true,
    showWhtColumn: true,
    showSubtotal: true,
    showVatAmount: true,
    showWhtAmount: true,
    showNetAmountToPay: true,
    showPaymentDetails: true,
    showTermsAndConditions: true,
    showCreatedBySignature: true,
  });
  const [defaultTerms, setDefaultTerms] = useState('');
  const [defaultValidityDays, setDefaultValidityDays] = useState(2);

  // Update local state when document type changes
  const handlePdfDocumentTypeChange = (docType: DocumentType) => {
    setPdfDocumentType(docType);
    if (allPdfSettings) {
      const settings = allPdfSettings[docType];
      setPdfFields(settings.fields);
      setDefaultTerms(settings.defaultTermsAndConditions);
      setDefaultValidityDays(settings.defaultValidityDays ?? 2);
    }
  };

  // Save current PDF settings to database
  const savePdfSettings = async (fields: PdfFieldSettings, terms: string, validityDays: number) => {
    try {
      await pdfSettingsApi.update(pdfDocumentType, {
        fields,
        defaultTermsAndConditions: terms,
        defaultValidityDays: validityDays,
      });
      // Update local cache
      if (allPdfSettings) {
        setAllPdfSettings({
          ...allPdfSettings,
          [pdfDocumentType]: {
            fields,
            defaultTermsAndConditions: terms,
            defaultValidityDays: validityDays,
          },
        });
      }
    } catch (e) {
      console.error('Failed to save PDF settings:', e);
    }
  };

  // Update field setting
  const handleFieldToggle = (field: keyof PdfFieldSettings) => {
    const newFields = { ...pdfFields, [field]: !pdfFields[field] };
    setPdfFields(newFields);
    savePdfSettings(newFields, defaultTerms, defaultValidityDays);
  };

  // Update default terms
  const handleTermsChange = (terms: string) => {
    setDefaultTerms(terms);
    savePdfSettings(pdfFields, terms, defaultValidityDays);
  };

  // Update default validity days
  const handleValidityDaysChange = (days: number) => {
    setDefaultValidityDays(days);
    savePdfSettings(pdfFields, defaultTerms, days);
  };

  // Refresh functions
  const refreshCompanies = async () => {
    try {
      const companiesData = await companiesApi.getAll();
      setCompanies(companiesData.map(dbCompanyToFrontend));
    } catch (e) {
      console.error('Failed to refresh companies:', e);
    }
  };

  const refreshProjects = async () => {
    try {
      const projectsData = await projectsApi.getAll();
      setProjects(projectsData.map(dbProjectToFrontend));
    } catch (e) {
      console.error('Failed to refresh projects:', e);
    }
  };

  const refreshBankAccounts = async () => {
    if (!selectedCompanyId) return;
    try {
      // If "all" is selected, fetch all bank accounts, otherwise filter by company
      const bankAccountsData = selectedCompanyId === 'all'
        ? await bankAccountsApi.getAll()
        : await bankAccountsApi.getByCompany(selectedCompanyId);
      setBankAccounts(bankAccountsData.map(dbBankAccountToFrontend));
    } catch (e) {
      console.error('Failed to refresh bank accounts:', e);
    }
  };

  const refreshWallets = async () => {
    try {
      const walletsData = await pettyCashApi.getAllWallets();
      setWallets(walletsData.map(w => ({
        id: w.id,
        walletName: w.wallet_name,
        userId: w.user_id || '',
        userName: w.user_name,
        companyId: w.company_id,
        companyName: companies.find(c => c.id === w.company_id)?.name || 'Unknown',
        balance: w.balance,
        beginningBalance: w.balance,
        currency: w.currency as PettyCashWallet['currency'],
        status: w.status as PettyCashWallet['status'],
        balanceLimit: w.balance_limit || undefined,
        lowBalanceThreshold: w.low_balance_threshold || undefined,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })));
    } catch (e) {
      console.error('Failed to refresh wallets:', e);
    }
  };

  // Gateway helpers
  const refreshGateways = async () => {
    try {
      const data = await beamMerchantAccountsApi.getAll();
      setGateways(data);
    } catch (e) {
      console.error('Failed to refresh gateways:', e);
    }
  };

  const openGatewayModal = (gateway?: typeof gateways[0]) => {
    if (gateway) {
      setEditingGateway(gateway);
      setGatewayForm({
        merchant_id: gateway.merchant_id,
        merchant_name: gateway.merchant_name,
        company_id: gateway.company_id,
        settlement_bank_account_id: gateway.settlement_bank_account_id || '',
        is_active: gateway.is_active,
        notes: gateway.notes || '',
      });
    } else {
      setEditingGateway(null);
      setGatewayForm({ merchant_id: '', merchant_name: '', company_id: '', settlement_bank_account_id: '', is_active: true, notes: '' });
    }
    setIsGatewayModalOpen(true);
  };

  const handleGatewaySave = async () => {
    setGatewaySaving(true);
    try {
      const payload = {
        merchant_id: gatewayForm.merchant_id,
        merchant_name: gatewayForm.merchant_name,
        company_id: gatewayForm.company_id,
        settlement_bank_account_id: gatewayForm.settlement_bank_account_id || null,
        is_active: gatewayForm.is_active,
        notes: gatewayForm.notes || null,
      };
      if (editingGateway) {
        await beamMerchantAccountsApi.update(editingGateway.id, payload);
      } else {
        await beamMerchantAccountsApi.create(payload);
      }
      setIsGatewayModalOpen(false);
      setEditingGateway(null);
      await refreshGateways();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save gateway');
    } finally {
      setGatewaySaving(false);
    }
  };

  const handleDeleteGateway = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment gateway?')) {
      try {
        await beamMerchantAccountsApi.delete(id);
        await refreshGateways();
      } catch (e) {
        console.error('Failed to delete gateway:', e);
      }
    }
  };

  // All bank accounts for gateway form dropdown
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  useEffect(() => {
    bankAccountsApi.getAll().then(data => setAllBankAccounts(data.map(dbBankAccountToFrontend))).catch(() => {});
  }, []);

  const gatewayBankAccounts = allBankAccounts.filter(ba =>
    gatewayForm.company_id ? ba.companyId === gatewayForm.company_id : false
  );

  // Company event handlers
  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleCompanySave = async (companyData: Partial<Company>) => {
    const dbData = frontendCompanyToDb(companyData);
    if (editingCompany) {
      await companiesApi.update(editingCompany.id, dbData);
    } else {
      await companiesApi.create(dbData);
    }
    setIsCompanyModalOpen(false);
    setEditingCompany(null);
    await refreshCompanies();
  };

  // Bank account event handlers
  const handleEditBankAccount = (account: BankAccount) => {
    setEditingBankAccount(account);
    setIsBankAccountModalOpen(true);
  };

  const handleToggleBankAccountStatus = async (id: string) => {
    try {
      await bankAccountsApi.toggleStatus(id);
      await refreshBankAccounts();
    } catch (e) {
      console.error('Failed to toggle bank account status:', e);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (confirm('Are you sure you want to delete this bank account?')) {
      try {
        await bankAccountsApi.delete(id);
        await refreshBankAccounts();
      } catch (e) {
        console.error('Failed to delete bank account:', e);
      }
    }
  };

  const handleBankAccountSave = async () => {
    setIsBankAccountModalOpen(false);
    setEditingBankAccount(null);
    await refreshBankAccounts();
  };

  // Project event handlers
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsApi.delete(id);
        await refreshProjects();
      } catch (e) {
        console.error('Failed to delete project:', e);
      }
    }
  };

  const handleProjectSave = async () => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
    await refreshProjects();
  };

  // Wallet event handlers
  const handleEditWallet = (wallet: PettyCashWallet) => {
    setEditingWallet(wallet);
    setIsWalletModalOpen(true);
  };

  const handleDeleteWallet = async (id: string) => {
    try {
      await pettyCashApi.deleteWallet(id);
      await refreshWallets();
    } catch (e) {
      console.error('Failed to delete wallet:', e);
      alert('Failed to delete wallet');
    }
  };

  const handleWalletSave = async () => {
    setIsWalletModalOpen(false);
    setEditingWallet(null);
    await refreshWallets();
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your accounting module preferences
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Financial Periods */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#5A7A8F]" />
              <h2 className="text-lg font-semibold text-gray-900">Financial Periods</h2>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Manage open and closed accounting periods. Closing a period prevents new journal entries from being posted to it.
          </p>

          {/* Company Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Company
            </label>
            <select
              value={fpCompanyId}
              onChange={(e) => setFpCompanyId(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
            >
              <option value="">Select a company...</option>
              {companies.filter(c => c.isActive).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {!fpCompanyId ? (
            <div className="text-center py-8 text-gray-500">
              <p>Select a company to view financial periods</p>
            </div>
          ) : fpLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading periods...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closed By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closed At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allPeriodStrings.map((period) => {
                    const record = getPeriodRecord(period);
                    const status = record?.status || 'open';
                    const isCurrentAction = fpActionLoading === period;
                    return (
                      <tr key={period}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{period}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : status === 'closed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {record?.closed_by || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {record?.closed_at
                            ? new Date(record.closed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {status === 'open' && (
                            <button
                              onClick={() => handleClosePeriod(period)}
                              disabled={isCurrentAction}
                              className="text-sm bg-[#5A7A8F] text-white px-3 py-1 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              {isCurrentAction && <Loader2 className="h-3 w-3 animate-spin" />}
                              Close Period
                            </button>
                          )}
                          {status === 'closed' && (
                            <button
                              onClick={() => handleReopenPeriod(period)}
                              disabled={isCurrentAction}
                              className="text-sm border border-[#5A7A8F] text-[#5A7A8F] px-3 py-1 rounded hover:bg-[#5A7A8F] hover:text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              {isCurrentAction && <Loader2 className="h-3 w-3 animate-spin" />}
                              Reopen
                            </button>
                          )}
                          {status === 'locked' && (
                            <span className="text-xs text-gray-400 italic">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Company Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-[#5A7A8F]" />
              <h2 className="text-lg font-semibold text-gray-900">Company Settings</h2>
            </div>
            <Link
              href="/accounting/manager/companies"
              className="text-sm text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
            >
              Manage All Companies →
            </Link>
          </div>

          {/* Show/Hide Inactive Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactiveCompanies"
              checked={showInactiveCompanies}
              onChange={(e) => setShowInactiveCompanies(e.target.checked)}
              className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <label htmlFor="showInactiveCompanies" className="text-sm text-gray-700">
              Show inactive companies
            </label>
          </div>

          {/* Company Information Table */}
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No companies found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className={!company.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {company.taxId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {company.currency || "THB"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {company.registeredAddress.street}
                        <div className="text-xs text-gray-500">
                          {company.registeredAddress.city}, {company.registeredAddress.state} {company.registeredAddress.postalCode}
                        </div>
                        <div className="text-xs text-gray-500">{company.registeredAddress.country}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                          title="Edit company"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bank Accounts Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-[#5A7A8F]" />
              <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
            </div>
            <button
              onClick={() => {
                setEditingBankAccount(null);
                setIsBankAccountModalOpen(true);
              }}
              className="text-sm bg-[#5A7A8F] text-white px-4 py-2 rounded-lg hover:bg-[#2c3e50] transition-colors inline-flex items-center gap-2"
            >
              + Add Bank Account
            </button>
          </div>

          {/* Company Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
            >
              <option value="all">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} {!company.isActive && "(Inactive)"}
                </option>
              ))}
            </select>
          </div>

          {/* Show/Hide Inactive Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactiveBankAccounts}
              onChange={(e) => setShowInactiveBankAccounts(e.target.checked)}
              className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Show inactive accounts
            </label>
          </div>

          {/* Bank Accounts Table */}
          {filteredBankAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No bank accounts found{selectedCompanyId !== 'all' ? ` for ${selectedCompany?.name}` : ''}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                    {selectedCompanyId === 'all' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank / Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GL Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBankAccounts.map((account) => (
                    <tr key={account.id} className={!account.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {account.accountName}
                        {!account.isActive && <span className="ml-2 text-gray-500">(Inactive)</span>}
                      </td>
                      {selectedCompanyId === 'all' && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {companies.find(c => c.id === account.companyId)?.name || 'Unknown'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {account.bankInformation.bankName}
                        {account.bankInformation.bankBranch && (
                          <div className="text-xs text-gray-500">{account.bankInformation.bankBranch}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{account.accountNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{account.currency}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{account.glAccountCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(account.openingBalance, account.currency)}
                        <div className="text-xs text-gray-500">{formatDate(account.openingBalanceDate)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleEditBankAccount(account)}
                          className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                          title="Edit bank account"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Gateways Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-[#5A7A8F]" />
              <h2 className="text-lg font-semibold text-gray-900">Payment Gateways</h2>
            </div>
            <button
              onClick={() => openGatewayModal()}
              className="text-sm bg-[#5A7A8F] text-white px-4 py-2 rounded-lg hover:bg-[#2c3e50] transition-colors inline-flex items-center gap-2"
            >
              + Add Gateway
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Manage Beam payment gateway merchant accounts and their settlement bank accounts.
          </p>

          {gateways.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No payment gateways configured</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settlement Bank Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gateways.map((gw) => (
                    <tr key={gw.id} className={!gw.is_active ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{gw.merchant_id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{gw.merchant_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{gw.company?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {gw.settlement_bank_account_id
                          ? allBankAccounts.find(ba => ba.id === gw.settlement_bank_account_id)?.accountName || 'Linked'
                          : <span className="text-gray-400">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          gw.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {gw.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openGatewayModal(gw)}
                            className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                            title="Edit gateway"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGateway(gw.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete gateway"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Anchor className="h-5 w-5 text-[#5A7A8F]" />
              <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            </div>
            <button
              onClick={() => {
                setEditingProject(null);
                setIsProjectModalOpen(true);
              }}
              className="text-sm bg-[#5A7A8F] text-white px-4 py-2 rounded-lg hover:bg-[#2c3e50] transition-colors inline-flex items-center gap-2"
            >
              + Add Project
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Manage projects with participants and ownership percentages across all companies in the group.
          </p>

          {/* Show/Hide Inactive Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactiveProjects"
              checked={showInactiveProjects}
              onChange={(e) => setShowInactiveProjects(e.target.checked)}
              className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <label htmlFor="showInactiveProjects" className="text-sm text-gray-700">
              Show inactive/completed projects
            </label>
          </div>

          {/* Projects Table */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No projects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className={project.status !== 'active' ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {project.code}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {project.name}
                        {project.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{project.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {companies.find(c => c.id === project.companyId)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{project.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {project.participants.length} participant{project.participants.length !== 1 ? 's' : ''}
                        {project.participants.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {project.participants.slice(0, 2).map(p => p.name).join(', ')}
                            {project.participants.length > 2 && ` +${project.participants.length - 2} more`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                          title="Edit project"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Petty Cash Wallets Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-[#5A7A8F]" />
              <h2 className="text-lg font-semibold text-gray-900">Petty Cash Wallets</h2>
            </div>
            <button
              onClick={() => {
                setEditingWallet(null);
                setIsWalletModalOpen(true);
              }}
              className="text-sm bg-[#5A7A8F] text-white px-4 py-2 rounded-lg hover:bg-[#2c3e50] transition-colors inline-flex items-center gap-2"
            >
              + Add Wallet
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Manage petty cash wallets, balance limits, and low balance alerts.
          </p>

          {/* Show/Hide Closed Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showClosedWallets"
              checked={showClosedWallets}
              onChange={(e) => setShowClosedWallets(e.target.checked)}
              className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <label htmlFor="showClosedWallets" className="text-sm text-gray-700">
              Show closed wallets
            </label>
          </div>

          {/* Wallets Table */}
          {filteredWallets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No petty cash wallets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holder</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWallets.map((wallet) => {
                    const isLowBalance = wallet.lowBalanceThreshold && wallet.balance <= wallet.lowBalanceThreshold;
                    return (
                      <tr key={wallet.id} className={wallet.status !== 'active' ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {wallet.walletName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {wallet.userName}
                          {wallet.userEmail && (
                            <div className="text-xs text-gray-500">{wallet.userEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {wallet.companyName}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          isLowBalance ? 'text-orange-600' : 'text-gray-900'
                        }`}>
                          {formatCurrency(wallet.balance, wallet.currency)}
                          {isLowBalance && (
                            <div className="text-xs text-orange-500">Low balance</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {wallet.balanceLimit ? formatCurrency(wallet.balanceLimit, wallet.currency) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            wallet.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {wallet.status === 'active' ? 'Active' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditWallet(wallet)}
                              className="text-[#5A7A8F] hover:text-[#2c3e50] transition-colors"
                              title="Edit wallet"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (wallet.balance !== 0) {
                                  alert('Cannot delete wallet with non-zero balance');
                                  return;
                                }
                                if (confirm('Are you sure you want to delete this wallet?')) {
                                  handleDeleteWallet(wallet.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Delete wallet"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Permissions */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-[#5A7A8F]" />
            <h2 className="text-lg font-semibold text-gray-900">User Permissions</h2>
          </div>
          <p className="text-sm text-gray-600">
            Manage user roles and access levels for the accounting module.
          </p>
          <button
            onClick={() => setIsUserManagementModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors"
          >
            Manage Users
          </button>
        </div>

        {/* Data Import - Super Admin Only */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Data Import</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Import historical financial data from previous accounting periods. This creates journal entries to record prior year retained earnings.
          </p>
          <button
            onClick={() => setIsImportPriorYearModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Prior Year Data
          </button>
        </div>

        {/* Notifications */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-[#5A7A8F]" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]" defaultChecked />
              <span className="text-sm text-gray-700">Email notifications for low cash balance</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]" defaultChecked />
              <span className="text-sm text-gray-700">Email notifications for pending approvals</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]" />
              <span className="text-sm text-gray-700">Daily summary reports</span>
            </label>
          </div>
        </div>

        {/* Document Numbering */}
        <NumberFormatSettings />

        {/* PDF & Documents Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-[#5A7A8F]" />
            <h2 className="text-lg font-semibold text-gray-900">PDF & Documents</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Configure which fields appear in PDF outputs and set default Terms & Conditions.
          </p>

          {/* Side-by-side layout: Settings + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Settings */}
            <div>
              {/* Document Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <div className="flex gap-2">
                  {(['quotation', 'invoice', 'receipt'] as DocumentType[]).map((docType) => (
                    <button
                      key={docType}
                      onClick={() => handlePdfDocumentTypeChange(docType)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pdfDocumentType === docType
                          ? 'bg-[#5A7A8F] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {docType.charAt(0).toUpperCase() + docType.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF Field Settings */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                  {pdfDocumentType.charAt(0).toUpperCase() + pdfDocumentType.slice(1)} PDF Fields
                </h3>

                {/* Header Section */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Company Header</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showCompanyAddress}
                        onChange={() => handleFieldToggle('showCompanyAddress')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Address</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showCompanyPhone}
                        onChange={() => handleFieldToggle('showCompanyPhone')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Phone</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showCompanyEmail}
                        onChange={() => handleFieldToggle('showCompanyEmail')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showCompanyTaxId}
                        onChange={() => handleFieldToggle('showCompanyTaxId')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Tax ID</span>
                    </label>
                  </div>
                </div>

                {/* Client Section */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Client Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showClientAddress}
                        onChange={() => handleFieldToggle('showClientAddress')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Address</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showClientEmail}
                        onChange={() => handleFieldToggle('showClientEmail')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showClientTaxId}
                        onChange={() => handleFieldToggle('showClientTaxId')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Tax ID</span>
                    </label>
                  </div>
                </div>

                {/* Document Details */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Document Details</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showValidUntil}
                        onChange={() => handleFieldToggle('showValidUntil')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Valid Until</span>
                    </label>
                  </div>
                  {/* Default Validity Days - only for quotation and invoice */}
                  {(pdfDocumentType === 'quotation' || pdfDocumentType === 'invoice') && (
                    <div className="mt-3">
                      <label className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Default Valid Until:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={defaultValidityDays}
                          onChange={(e) => handleValidityDaysChange(parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                        />
                        <span className="text-sm text-gray-500">days after creation</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Line Item Columns */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Line Item Columns</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showVatColumn}
                        onChange={() => handleFieldToggle('showVatColumn')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">VAT %</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showWhtColumn}
                        onChange={() => handleFieldToggle('showWhtColumn')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">WHT %</span>
                    </label>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Summary Section</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showSubtotal}
                        onChange={() => handleFieldToggle('showSubtotal')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Subtotal</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showVatAmount}
                        onChange={() => handleFieldToggle('showVatAmount')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">VAT Amount</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showWhtAmount}
                        onChange={() => handleFieldToggle('showWhtAmount')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">WHT Amount</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showNetAmountToPay}
                        onChange={() => handleFieldToggle('showNetAmountToPay')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Net to Pay</span>
                    </label>
                  </div>
                </div>

                {/* Additional Sections */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Additional Sections</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showPaymentDetails}
                        onChange={() => handleFieldToggle('showPaymentDetails')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Payment Details</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showTermsAndConditions}
                        onChange={() => handleFieldToggle('showTermsAndConditions')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Terms</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pdfFields.showCreatedBySignature}
                        onChange={() => handleFieldToggle('showCreatedBySignature')}
                        className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                      />
                      <span className="text-sm text-gray-700">Signature</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Default Terms & Conditions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                  Default Terms & Conditions
                </h3>
                <p className="text-xs text-gray-500 mb-2">
                  Auto-populates when creating a new {pdfDocumentType}.
                </p>
                <textarea
                  value={defaultTerms}
                  onChange={(e) => handleTermsChange(e.target.value)}
                  rows={4}
                  placeholder={`Enter default terms and conditions for ${pdfDocumentType}s...`}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                />
              </div>
            </div>

            {/* Right Column: Live Preview */}
            <div className="lg:block">
              <PdfPreviewPanel
                fieldSettings={pdfFields}
                documentType={pdfDocumentType}
                defaultTerms={defaultTerms}
              />
            </div>
          </div>
        </div>

        {/* Journal Event Settings Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <JournalEventSettings companies={companies} />
        </div>

        {/* Auto-save indicator */}
        <div className="flex justify-end">
          <p className="text-sm text-gray-500 italic">
            Settings are saved automatically as you make changes.
          </p>
        </div>
      </div>
      )}

      {/* Company Modal */}
      <CompanyFormModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSave={handleCompanySave}
        editingCompany={editingCompany}
      />

      {/* Bank Account Modal */}
      <BankAccountFormModal
        isOpen={isBankAccountModalOpen}
        onClose={() => setIsBankAccountModalOpen(false)}
        onSave={handleBankAccountSave}
        editingBankAccount={editingBankAccount}
        selectedCompanyId={selectedCompanyId}
        onToggleStatus={handleToggleBankAccountStatus}
        onDelete={handleDeleteBankAccount}
      />

      {/* Project Modal */}
      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleProjectSave}
        editingProject={editingProject}
        selectedCompanyId={selectedCompanyId}
      />

      {/* Wallet Modal */}
      <WalletFormModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSave={handleWalletSave}
        editingWallet={editingWallet}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />

      {/* Gateway Modal */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                <input
                  type="text"
                  value={gatewayForm.merchant_id}
                  onChange={(e) => setGatewayForm(f => ({ ...f, merchant_id: e.target.value }))}
                  placeholder="e.g. farawayyacht"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
                <input
                  type="text"
                  value={gatewayForm.merchant_name}
                  onChange={(e) => setGatewayForm(f => ({ ...f, merchant_name: e.target.value }))}
                  placeholder="e.g. Faraway Yachting - Beam"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={gatewayForm.company_id}
                  onChange={(e) => setGatewayForm(f => ({ ...f, company_id: e.target.value, settlement_bank_account_id: '' }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
                >
                  <option value="">Select company...</option>
                  {companies.filter(c => c.isActive).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Settlement Bank Account</label>
                <select
                  value={gatewayForm.settlement_bank_account_id}
                  onChange={(e) => setGatewayForm(f => ({ ...f, settlement_bank_account_id: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
                  disabled={!gatewayForm.company_id}
                >
                  <option value="">Select bank account...</option>
                  {gatewayBankAccounts.filter(ba => ba.isActive).map(ba => (
                    <option key={ba.id} value={ba.id}>{ba.accountName} - {ba.accountNumber}</option>
                  ))}
                </select>
                {!gatewayForm.company_id && (
                  <p className="text-xs text-gray-500 mt-1">Select a company first</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gatewayActive"
                  checked={gatewayForm.is_active}
                  onChange={(e) => setGatewayForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
                <label htmlFor="gatewayActive" className="text-sm text-gray-700">Active</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={gatewayForm.notes}
                  onChange={(e) => setGatewayForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsGatewayModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGatewaySave}
                disabled={gatewaySaving || !gatewayForm.merchant_id || !gatewayForm.merchant_name || !gatewayForm.company_id}
                className="px-4 py-2 text-sm text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors disabled:opacity-50"
              >
                {gatewaySaving ? 'Saving...' : editingGateway ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Prior Year Modal */}
      <ImportPriorYearModal
        isOpen={isImportPriorYearModalOpen}
        onClose={() => setIsImportPriorYearModalOpen(false)}
      />
    </AppShell>
  );
}
