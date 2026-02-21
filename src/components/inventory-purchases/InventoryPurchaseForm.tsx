'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, AlertCircle, Loader2, Package } from 'lucide-react';
import { VendorSelector } from '../expenses/VendorSelector';
import { InventoryPurchaseLineItemEditor } from './InventoryPurchaseLineItemEditor';
import type {
  InventoryPurchaseItem,
  InventoryPurchase,
  ExpensePricingType,
  ReceiptStatus,
  InventoryPaymentType,
} from '@/data/expenses/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { pettyCashApi } from '@/lib/supabase/api/pettyCash';
import { inventoryPurchasesApi } from '@/lib/supabase/api/inventoryPurchases';
import { dbCompanyToFrontend, dbProjectToFrontend, dbBankAccountToFrontend } from '@/lib/supabase/transforms';
import type { BankAccount } from '@/data/banking/types';
import {
  calculateDocumentTotals,
  calculateLineItem,
  getTodayISO,
  generateId,
} from '@/lib/expenses/utils';
import { getExchangeRate } from '@/lib/exchangeRate/service';
import type { FxRateSource } from '@/data/exchangeRate/types';
import { createClient } from '@/lib/supabase/client';

// Petty cash wallet type (from DB)
interface PettyCashWalletOption {
  id: string;
  wallet_name: string;
  user_name: string;
  company_id: string;
  currency: string;
  calculated_balance: number;
}

interface InventoryPurchaseFormProps {
  purchase?: InventoryPurchase;
  basePath: string; // e.g. '/accounting/manager/expenses/purchase-inventory'
  onCancel?: () => void;
}

export default function InventoryPurchaseForm({
  purchase,
  basePath,
  onCancel,
}: InventoryPurchaseFormProps) {
  const router = useRouter();
  const isEditing = !!purchase;

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [pettyCashWallets, setPettyCashWallets] = useState<PettyCashWalletOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [companyId, setCompanyId] = useState(purchase?.companyId || '');
  const predefinedCategories = ['general', 'provisions', 'boat_parts', 'office_supplies'];
  const initialCategory = purchase?.category || 'general';
  const [category, setCategory] = useState(
    predefinedCategories.includes(initialCategory) ? initialCategory : 'other'
  );
  const [customCategory, setCustomCategory] = useState(
    predefinedCategories.includes(initialCategory) ? '' : initialCategory
  );
  const [vendorId, setVendorId] = useState(purchase?.vendorId || '');
  const [vendorName, setVendorName] = useState(purchase?.vendorName || '');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState(
    purchase?.supplierInvoiceNumber || ''
  );
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(
    purchase?.supplierInvoiceDate || ''
  );
  const [purchaseDate, setPurchaseDate] = useState(purchase?.purchaseDate || getTodayISO());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    purchase?.expectedDeliveryDate || ''
  );
  const [actualDeliveryDate, setActualDeliveryDate] = useState(
    purchase?.actualDeliveryDate || ''
  );
  const [currency, setCurrency] = useState<Currency>(purchase?.currency || 'THB');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(purchase?.fxRate);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [fxRateSource, setFxRateSource] = useState<FxRateSource>(
    purchase?.fxRateSource || 'bot'
  );
  const [fxRateDate, setFxRateDate] = useState<string | undefined>(purchase?.fxRateDate);
  const [pricingType, setPricingType] = useState<ExpensePricingType>(
    purchase?.pricingType || 'exclude_vat'
  );
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>(
    purchase?.receiptStatus || 'pending'
  );

  // Line items
  const getInitialLineItems = (): InventoryPurchaseItem[] => {
    if (purchase?.lineItems) {
      return purchase.lineItems;
    }
    return [
      {
        id: generateId(),
        description: '',
        sku: undefined,
        unit: 'pcs',
        quantity: 1,
        quantityConsumed: 0,
        unitPrice: 0,
        taxRate: 7,
        amount: 0,
        preVatAmount: 0,
        projectId: '',
        accountCode: '1200',
        expenseAccountCode: '',
      },
    ];
  };

  const [lineItems, setLineItems] = useState<InventoryPurchaseItem[]>(getInitialLineItems);

  // Payment
  const [paymentType, setPaymentType] = useState<InventoryPaymentType>('bank');
  const [bankAccountId, setBankAccountId] = useState('');
  const [pettyWalletId, setPettyWalletId] = useState('');

  // Notes
  const [notes, setNotes] = useState(purchase?.notes || '');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === companyId);
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

  // Load initial data (companies)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const companiesData = await companiesApi.getActive();
        setCompanies(companiesData.map(dbCompanyToFrontend));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load all projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsData = await projectsApi.getAll();
        const filteredProjects = projectsData.filter((p) => p.status !== 'completed');
        setCompanyProjects(filteredProjects.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Load bank accounts when company changes
  useEffect(() => {
    const loadBankAccounts = async () => {
      if (!companyId) {
        setBankAccounts([]);
        return;
      }
      try {
        const accountsData = await bankAccountsApi.getByCompanyActive(companyId);
        setBankAccounts(accountsData.map(dbBankAccountToFrontend));
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
      }
    };
    loadBankAccounts();
  }, [companyId]);

  // Load petty cash wallets when company changes
  useEffect(() => {
    const loadWallets = async () => {
      if (!companyId) {
        setPettyCashWallets([]);
        return;
      }
      try {
        const allWallets = await pettyCashApi.getAllWalletsWithCalculatedBalances();
        // RPC returns snake_case fields from the DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const companyWallets = (allWallets as any[])
          .filter((w) => w.company_id === companyId && w.status === 'active')
          .map((w) => ({
            id: w.id,
            wallet_name: w.wallet_name,
            user_name: w.user_name || '',
            company_id: w.company_id,
            currency: w.currency || 'THB',
            calculated_balance: Number(w.calculated_balance) || 0,
          }));
        setPettyCashWallets(companyWallets);
      } catch (error) {
        console.error('Failed to load petty cash wallets:', error);
      }
    };
    loadWallets();
  }, [companyId]);

  // Update line items tax rate when pricing type changes to 'no_vat'
  useEffect(() => {
    setLineItems((prev) =>
      prev.map((item) => {
        const newTaxRate = effectivePricingType === 'no_vat' ? 0 : (item.taxRate === 0 ? 7 : item.taxRate);
        const calc = calculateLineItem(
          item.quantity, item.unitPrice, newTaxRate, 0, 'pre_vat', effectivePricingType, undefined
        );
        return { ...item, taxRate: newTaxRate, ...calc };
      })
    );
  }, [effectivePricingType]);

  // Auto-fetch exchange rate when currency or purchase date changes
  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'THB') {
        setExchangeRate(1);
        return;
      }
      if (!purchaseDate) return;
      if (isEditing && purchase?.fxRate && fxRateSource === 'manual') return;

      setIsFetchingRate(true);
      try {
        const result = await getExchangeRate(currency, purchaseDate);
        if (result.success && result.rate) {
          setExchangeRate(result.rate);
          setFxRateSource(result.source || 'bot');
          setFxRateDate(result.date || purchaseDate);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchRate();
  }, [currency, purchaseDate]);

  // Calculate totals — add default WHT fields for compatibility with calculateDocumentTotals
  const totals = calculateDocumentTotals(
    lineItems.map((li) => ({ ...li, whtRate: 0 as const, whtBaseCalculation: 'pre_vat' as const, whtAmount: 0 })),
    effectivePricingType
  );

  // Validation
  const validate = (action: 'draft' | 'record'): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyId) newErrors.companyId = 'Company is required';

    if (action === 'record') {
      if (!purchaseDate) newErrors.purchaseDate = 'Purchase date is required';

      // Validate payment method
      if (paymentType === 'bank' && !bankAccountId) {
        newErrors.paymentMethod = 'Bank account is required';
      }
      if (paymentType === 'petty_cash' && !pettyWalletId) {
        newErrors.paymentMethod = 'Petty cash wallet is required';
      }

      // Check line items
      if (lineItems.length === 0) {
        newErrors.lineItems = 'At least one line item is required';
      } else {
        const missingProjects = lineItems.filter((item) => !item.projectId);
        if (missingProjects.length > 0) {
          newErrors.lineItems = 'All line items must have a project selected';
        }
        const missingDescriptions = lineItems.filter((item) => !item.description.trim());
        if (missingDescriptions.length > 0) {
          newErrors.lineItems = 'All line items must have a description';
        }
      }

      // Petty cash balance check
      if (paymentType === 'petty_cash' && pettyWalletId) {
        const selectedWallet = pettyCashWallets.find((w) => w.id === pettyWalletId);
        if (selectedWallet && totals.totalAmount > selectedWallet.calculated_balance) {
          newErrors.paymentMethod = `Insufficient wallet balance (${selectedWallet.currency} ${selectedWallet.calculated_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async (action: 'draft' | 'record') => {
    setErrors({});

    if (!validate(action)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      // Get current user
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || '';

      // Prepare purchase data for DB
      const purchaseDbData = {
        company_id: companyId,
        vendor_id: vendorId || null,
        vendor_name: vendorName || null,
        supplier_invoice_number: supplierInvoiceNumber || null,
        supplier_invoice_date: supplierInvoiceDate || null,
        purchase_date: purchaseDate,
        category: category === 'other' ? customCategory || 'general' : category,
        expected_delivery_date: expectedDeliveryDate || null,
        actual_delivery_date: actualDeliveryDate || null,
        pricing_type: effectivePricingType,
        currency,
        fx_rate: currency !== 'THB' ? exchangeRate || null : null,
        fx_rate_source: currency !== 'THB' ? fxRateSource : null,
        fx_rate_date: currency !== 'THB' ? fxRateDate || null : null,
        subtotal: totals.subtotal,
        vat_amount: totals.vatAmount,
        total_amount: totals.totalAmount,
        net_payable: totals.totalAmount, // No WHT for inventory purchases
        thb_subtotal:
          currency !== 'THB' && exchangeRate ? totals.subtotal * exchangeRate : null,
        thb_vat_amount:
          currency !== 'THB' && exchangeRate ? totals.vatAmount * exchangeRate : null,
        thb_total_amount:
          currency !== 'THB' && exchangeRate ? totals.totalAmount * exchangeRate : null,
        thb_net_payable:
          currency !== 'THB' && exchangeRate ? totals.totalAmount * exchangeRate : null,
        payment_status: action === 'draft' ? 'unpaid' : 'paid',
        amount_paid: action === 'draft' ? 0 : totals.totalAmount,
        amount_outstanding: action === 'draft' ? totals.totalAmount : 0,
        status: action === 'draft' ? 'draft' : 'received',
        receipt_status: receiptStatus,
        receipt_received_date: null,
        receipt_received_by: null,
        received_date: action === 'record' ? purchaseDate : null,
        received_by: action === 'record' ? userId : null,
        voided_date: null,
        void_reason: null,
        notes: notes || null,
        attachments: null,
        created_by: userId || null,
      };

      // Prepare line items for DB
      const lineItemsDbData = lineItems.map((item, idx) => ({
        description: item.description,
        sku: item.sku || null,
        unit: item.unit || 'pcs',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        amount: item.amount,
        pre_vat_amount: item.preVatAmount,
        project_id: item.projectId,
        account_code: '1200',
        expense_account_code: item.expenseAccountCode || null,
        attachments: null,
        line_order: idx + 1,
        purchase_id: '', // Will be set by API
      }));

      const paymentInfo = action === 'record' ? {
        paymentDate: purchaseDate,
        amount: totals.totalAmount,
        paymentType,
        bankAccountId: paymentType === 'bank' ? bankAccountId : undefined,
        pettyWalletId: paymentType === 'petty_cash' ? pettyWalletId : undefined,
        fxRate: currency !== 'THB' ? exchangeRate : undefined,
        thbAmount:
          currency !== 'THB' && exchangeRate
            ? totals.totalAmount * exchangeRate
            : undefined,
      } : undefined;

      if (isEditing && purchase) {
        // Update existing purchase
        const result = await inventoryPurchasesApi.updateFull(
          purchase.id,
          purchaseDbData as any,
          lineItemsDbData as any,
          action,
          paymentInfo,
          userId
        );
        router.push(`${basePath}/${result.purchase.id}`);
      } else if (action === 'draft') {
        // Save as draft — no payment
        const newPurchase = await inventoryPurchasesApi.create(
          purchaseDbData as any,
          lineItemsDbData as any
        );
        router.push(`${basePath}/${newPurchase.id}`);
      } else {
        // Record with payment
        const result = await inventoryPurchasesApi.recordWithPayment(
          purchaseDbData as any,
          lineItemsDbData as any,
          paymentInfo!,
          userId
        );
        router.push(`${basePath}/${result.purchase.id}`);
      }
    } catch (error: unknown) {
      console.error('Error saving inventory purchase:', error);
      let errorMessage = 'Failed to save purchase. Please try again.';
      if (error && typeof error === 'object') {
        const err = error as { message?: string; details?: string };
        if (err.message) errorMessage = err.message;
        if (err.details) errorMessage += `\n\nDetails: ${err.details}`;
      }
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(basePath);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-[#5A7A8F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Inventory Purchase' : 'New Inventory Purchase'}
            </h1>
            {isEditing && purchase && (
              <p className="text-sm text-gray-500 mt-0.5">{purchase.purchaseNumber}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('record')}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Record Payment'}</span>
          </button>
        </div>
      </div>

      {/* General Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following errors:
              </h3>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Purchase Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setBankAccountId('');
                setPettyWalletId('');
              }}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                errors.companyId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="mt-1 text-xs text-red-600">{errors.companyId}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            >
              <option value="general">General</option>
              <option value="provisions">Provisions & Consumables</option>
              <option value="boat_parts">Boat Parts & Equipment</option>
              <option value="office_supplies">Office & General Supplies</option>
              <option value="other">Other (custom)...</option>
            </select>
            {category === 'other' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category..."
                className="mt-2 w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            )}
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
            <VendorSelector
              value={vendorId}
              onChange={(id, name) => {
                setVendorId(id);
                setVendorName(name);
              }}
            />
            <p className="mt-1 text-xs text-gray-500">Optional</p>
          </div>

          {/* Supplier Invoice # */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Invoice #
            </label>
            <input
              type="text"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              placeholder="e.g., INV-12345"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            />
          </div>

          {/* Supplier Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Invoice Date
            </label>
            <input
              type="date"
              value={supplierInvoiceDate}
              onChange={(e) => setSupplierInvoiceDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                errors.purchaseDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.purchaseDate && (
              <p className="mt-1 text-xs text-red-600">{errors.purchaseDate}</p>
            )}
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Delivery
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            />
          </div>

          {/* Actual Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Delivery
            </label>
            <input
              type="date"
              value={actualDeliveryDate}
              onChange={(e) => setActualDeliveryDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <CurrencySelect
              value={currency}
              onChange={(val) => setCurrency(val as Currency)}
            />
          </div>

          {/* Exchange Rate (for non-THB) */}
          {currency !== 'THB' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exchange Rate to THB
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={exchangeRate || ''}
                  onChange={(e) => {
                    setExchangeRate(parseFloat(e.target.value) || undefined);
                    setFxRateSource('manual');
                  }}
                  disabled={isFetchingRate}
                  step="0.0001"
                  placeholder="e.g., 35.50"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100"
                />
                {isFetchingRate && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#5A7A8F]" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                1 {currency} = {exchangeRate ? exchangeRate.toFixed(4) : '?'} THB
                {fxRateSource === 'bot' && !isFetchingRate && (
                  <span className="ml-2 text-green-600">
                    Bank of Thailand ({fxRateDate || purchaseDate})
                  </span>
                )}
                {fxRateSource === 'fallback' && !isFetchingRate && (
                  <span className="ml-2 text-amber-600">
                    Frankfurt fallback ({fxRateDate || purchaseDate})
                  </span>
                )}
                {fxRateSource === 'manual' && !isFetchingRate && (
                  <span className="ml-2 text-gray-600">Manual rate</span>
                )}
              </p>
            </div>
          )}

          {/* Receipt Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Status
            </label>
            <select
              value={receiptStatus}
              onChange={(e) => setReceiptStatus(e.target.value as ReceiptStatus)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="not_required">Not Required</option>
            </select>
          </div>
        </div>

        {/* Pricing Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pricing Type
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="exclude_vat"
                checked={effectivePricingType === 'exclude_vat'}
                onChange={(e) => setPricingType(e.target.value as ExpensePricingType)}
                disabled={!isVatAvailable}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span
                className={`text-sm ${!isVatAvailable ? 'text-gray-400' : 'text-gray-700'}`}
              >
                Exclude VAT (prices net, VAT added)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="include_vat"
                checked={effectivePricingType === 'include_vat'}
                onChange={(e) => setPricingType(e.target.value as ExpensePricingType)}
                disabled={!isVatAvailable}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span
                className={`text-sm ${!isVatAvailable ? 'text-gray-400' : 'text-gray-700'}`}
              >
                Include VAT (prices gross, VAT extracted)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="no_vat"
                checked={effectivePricingType === 'no_vat'}
                onChange={(e) => setPricingType(e.target.value as ExpensePricingType)}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F]"
              />
              <span className="text-sm text-gray-700">No VAT</span>
            </label>
          </div>
          {!isVatAvailable && (
            <p className="mt-2 text-xs text-amber-600">
              Selected company is not VAT registered. Only "No VAT" mode is available.
            </p>
          )}
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Line Items {lineItems.length > 0 && `(${lineItems.length})`}
        </h2>

        {!companyId && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Please select a company first to load available projects.
            </p>
          </div>
        )}

        {companyId && (
          <InventoryPurchaseLineItemEditor
            lineItems={lineItems}
            onChange={setLineItems}
            pricingType={effectivePricingType}
            currency={currency}
            projects={companyProjects}
            exchangeRate={exchangeRate}
          />
        )}

        {errors.lineItems && (
          <p className="text-sm text-red-600">{errors.lineItems}</p>
        )}
      </div>

      {/* Payment Method Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Payment Method
        </h2>

        <p className="text-sm text-gray-500">
          Select how this purchase was paid. Payment is recorded when you click "Save & Record Payment".
        </p>

        {/* Payment Type Radio */}
        <div className="flex gap-6 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="bank"
              checked={paymentType === 'bank'}
              onChange={() => setPaymentType('bank')}
              className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <span className="text-sm font-medium text-gray-700">Bank Transfer</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="cash"
              checked={paymentType === 'cash'}
              onChange={() => setPaymentType('cash')}
              className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <span className="text-sm font-medium text-gray-700">Cash on Hand</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="petty_cash"
              checked={paymentType === 'petty_cash'}
              onChange={() => setPaymentType('petty_cash')}
              className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <span className="text-sm font-medium text-gray-700">Petty Cash</span>
          </label>
        </div>

        {/* Bank Account Selector */}
        {paymentType === 'bank' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Account <span className="text-red-500">*</span>
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              disabled={!companyId}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 ${
                errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select bank account...</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} - {account.bankInformation?.bankName} ({account.currency})
                </option>
              ))}
            </select>
            {!companyId && (
              <p className="mt-1 text-xs text-gray-500">
                Select a company first to load bank accounts
              </p>
            )}
            {companyId && bankAccounts.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No bank accounts found for this company
              </p>
            )}
          </div>
        )}

        {/* Cash on Hand info */}
        {paymentType === 'cash' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-600">
              Payment will be recorded against <span className="font-medium">GL 1020 - Cash on Hand</span>.
            </p>
          </div>
        )}

        {/* Petty Cash Wallet Selector */}
        {paymentType === 'petty_cash' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Petty Cash Wallet <span className="text-red-500">*</span>
            </label>
            <select
              value={pettyWalletId}
              onChange={(e) => setPettyWalletId(e.target.value)}
              disabled={!companyId}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 ${
                errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select petty cash wallet...</option>
              {pettyCashWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.wallet_name} ({wallet.user_name}) — Balance: {wallet.currency}{' '}
                  {wallet.calculated_balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </option>
              ))}
            </select>
            {!companyId && (
              <p className="mt-1 text-xs text-gray-500">
                Select a company first to load wallets
              </p>
            )}
            {companyId && pettyCashWallets.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No active petty cash wallets found for this company
              </p>
            )}
            {pettyWalletId && (
              <p className="mt-1 text-xs text-gray-500">
                A petty cash expense record will be auto-created for wallet balance tracking.
              </p>
            )}
          </div>
        )}

        {errors.paymentMethod && (
          <p className="text-sm text-red-600">{errors.paymentMethod}</p>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Additional Information
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this purchase..."
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
          />
        </div>
      </div>
    </div>
  );
}
