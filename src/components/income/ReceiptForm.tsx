'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Share2, ChevronDown, Pencil, Loader2 } from 'lucide-react';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import PaymentRecordEditor from './PaymentRecordEditor';
import ReceiptPrintView from './ReceiptPrintView';
import WhtReceiptPrintView from './WhtReceiptPrintView';
import AccountSelector from '@/components/common/AccountSelector';
import { RelatedJournalEntries } from '@/components/accounting/RelatedJournalEntries';
import { CharterInfoBox } from './CharterInfoBox';
import type { Receipt, PaymentRecord, AdjustmentType, LineItem, PricingType, CharterType } from '@/data/income/types';
import { charterTypeAccountCodes } from '@/data/income/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import type { BankAccount } from '@/data/banking/types';
import type { Contact } from '@/data/contact/types';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { invoicesApi } from '@/lib/supabase/api/invoices';
import { documentNumbersApi } from '@/lib/supabase/api/documentNumbers';
import { dbCompanyToFrontend, dbProjectToFrontend, dbBankAccountToFrontend, dbContactToFrontend, dbInvoiceLineItemToFrontend } from '@/lib/supabase/transforms';
import { calculateReceiptTotals } from '@/data/income/receipts';
import {
  getTodayISO,
  generateId,
  formatCurrency,
  generateReceiptNumber,
  calculateDocumentTotals,
  calculateLineItemTotal,
  calculateTotalWhtAmount
} from '@/lib/income/utils';
import { getDefaultTermsAndConditions } from '@/data/settings/pdfSettings';
import { getExchangeRate } from '@/lib/exchangeRate/service';
import type { FxRateSource } from '@/data/exchangeRate/types';

interface ReceiptFormProps {
  receipt?: Receipt;
  invoiceId?: string; // For pre-filling from invoice
  onCancel?: () => void;
}

export default function ReceiptForm({ receipt, invoiceId, onCancel }: ReceiptFormProps) {
  const router = useRouter();
  const isEditing = !!receipt;

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [companyBankAccounts, setCompanyBankAccounts] = useState<BankAccount[]>([]);
  const [clientContact, setClientContact] = useState<Contact | undefined>(undefined);
  const [sourceInvoice, setSourceInvoice] = useState<{ companyId: string; clientId: string; clientName: string; currency: Currency; pricingType: PricingType; invoiceNumber: string; lineItems: LineItem[] } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Form state - initialized from receipt or defaults (invoice data loaded async)
  const [companyId, setCompanyId] = useState(receipt?.companyId || '');
  const [clientId, setClientId] = useState(receipt?.clientId || '');
  const [clientName, setClientName] = useState(receipt?.clientName || '');
  // Charter information
  const [boatId, setBoatId] = useState(receipt?.boatId || '');
  const [charterType, setCharterType] = useState<CharterType | ''>(receipt?.charterType || '');
  const [charterDateFrom, setCharterDateFrom] = useState(receipt?.charterDateFrom || '');
  const [charterDateTo, setCharterDateTo] = useState(receipt?.charterDateTo || '');
  const [charterTime, setCharterTime] = useState(receipt?.charterTime || '');
  const [externalBoatName, setExternalBoatName] = useState('');
  const [receiptDate, setReceiptDate] = useState(receipt?.receiptDate || getTodayISO());
  const [currency, setCurrency] = useState<Currency>(receipt?.currency || 'USD');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(receipt?.fxRate);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [fxRateSource, setFxRateSource] = useState<FxRateSource>(receipt?.fxRateSource || 'bot');
  const [fxRateDate, setFxRateDate] = useState<string | undefined>(receipt?.fxRateDate);

  // Receipt number - generate if new, use existing if editing
  const [receiptNumber, setReceiptNumber] = useState(receipt?.receiptNumber || '');

  // Reference - set to invoice number when creating from invoice
  const [reference, setReference] = useState(receipt?.reference || '');

  // Pricing type
  const [pricingType, setPricingType] = useState<PricingType>(receipt?.pricingType || 'exclude_vat');

  // Line items - copy from invoice if creating from invoice
  const [lineItems, setLineItems] = useState<LineItem[]>(
    receipt?.lineItems || [
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 7,
        whtRate: 0,
        customWhtAmount: undefined,
        amount: 0,
        accountCode: '',
        projectId: '',
      },
    ]
  );

  // Payment records
  const [payments, setPayments] = useState<PaymentRecord[]>(receipt?.payments || []);

  // Fee/Adjustment
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(receipt?.adjustmentType || 'none');
  const [adjustmentAmount, setAdjustmentAmount] = useState(receipt?.adjustmentAmount || 0);
  const [adjustmentAccountCode, setAdjustmentAccountCode] = useState(receipt?.adjustmentAccountCode || '');
  const [adjustmentRemark, setAdjustmentRemark] = useState(receipt?.adjustmentRemark || '');

  // Notes
  const [notes, setNotes] = useState(receipt?.notes || (isEditing ? '' : getDefaultTermsAndConditions('invoice')));
  const [internalNotes, setInternalNotes] = useState(receipt?.internalNotes || '');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(receipt?.status || 'draft');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showWhtPreview, setShowWhtPreview] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  // Load initial data (companies and optionally invoice)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load companies
        const companiesData = await companiesApi.getActive();
        setCompanies(companiesData.map(dbCompanyToFrontend));

        // Load invoice data if creating from invoice
        if (invoiceId) {
          const invoiceWithItems = await invoicesApi.getByIdWithLineItems(invoiceId);
          if (invoiceWithItems) {
            const lineItemsData = invoiceWithItems.line_items?.map(item => ({
              ...dbInvoiceLineItemToFrontend(item),
              id: generateId(),
            })) || [];

            const invoiceData = {
              companyId: invoiceWithItems.company_id,
              clientId: invoiceWithItems.client_id || '',
              clientName: invoiceWithItems.client_name,
              currency: (invoiceWithItems.currency || 'USD') as Currency,
              pricingType: (invoiceWithItems.pricing_type || 'exclude_vat') as PricingType,
              invoiceNumber: invoiceWithItems.invoice_number,
              lineItems: lineItemsData,
            };
            setSourceInvoice(invoiceData);

            // Pre-fill form from invoice
            setCompanyId(invoiceData.companyId);
            setClientId(invoiceData.clientId);
            setClientName(invoiceData.clientName);
            setCurrency(invoiceData.currency);
            setPricingType(invoiceData.pricingType);
            setReference(invoiceData.invoiceNumber);
            if (lineItemsData.length > 0) {
              setLineItems(lineItemsData);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [invoiceId]);

  // Load all projects (projects can be assigned from any company in the group)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Get all projects across all companies (active and inactive, not completed)
        // Note: Projects belong to a Company for legal registration, but transactions
        // for P&L calculation can come from any company in the Faraway Yachting group
        const projectsData = await projectsApi.getAll();
        // Filter to show active and inactive projects (not completed)
        const filteredProjects = projectsData.filter(p => p.status !== 'completed');
        setCompanyProjects(filteredProjects.map(dbProjectToFrontend));
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Load company-specific data when company changes (bank accounts only)
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!companyId) {
        setCompanyBankAccounts([]);
        return;
      }
      try {
        const bankAccountsData = await bankAccountsApi.getByCompanyActive(companyId);
        setCompanyBankAccounts(bankAccountsData.map(dbBankAccountToFrontend));
      } catch (error) {
        console.error('Failed to load company bank accounts:', error);
      }
    };
    loadCompanyData();
  }, [companyId]);

  // Generate receipt number when company is selected (for new documents only)
  useEffect(() => {
    const generateNumber = async () => {
      if (!companyId || isEditing || receiptNumber) return;
      try {
        const nextNumber = await documentNumbersApi.getNextDocumentNumber(companyId, 'receipt');
        setReceiptNumber(nextNumber);
      } catch (error) {
        console.error('Failed to generate receipt number:', error);
      }
    };
    generateNumber();
  }, [companyId, isEditing]);

  // Load client contact when client changes
  useEffect(() => {
    const loadClientContact = async () => {
      if (!clientId) {
        setClientContact(undefined);
        return;
      }
      try {
        const contact = await contactsApi.getById(clientId);
        if (contact) {
          setClientContact(dbContactToFrontend(contact));
        }
      } catch (error) {
        console.error('Failed to load client contact:', error);
      }
    };
    loadClientContact();
  }, [clientId]);

  // Get selected company
  const selectedCompany = companies.find((c) => c.id === companyId);

  // Check if VAT is available for selected company
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;

  // Force "No VAT" if company is not VAT registered
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

  // Calculate document totals
  const documentTotals = calculateDocumentTotals(lineItems, effectivePricingType);
  const whtAmount = calculateTotalWhtAmount(lineItems, effectivePricingType);
  const netAmountToPay = documentTotals.totalAmount - whtAmount;

  // Calculate receipt totals (payments + adjustments)
  const receiptTotals = calculateReceiptTotals(payments, adjustmentType, adjustmentAmount, netAmountToPay);

  // Agency project codes (when selected, external boat name is used)
  const AGENCY_PROJECT_CODES = ['FA'];

  // Format date as DD MMM YYYY (e.g., 01 Jan 2026)
  const formatDateForDescription = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Handle Add to Booking Calendar - navigate to booking calendar with pre-filled data
  // Receipt -> Booked status
  const handleAddToBooking = () => {
    // Find selected boat
    const selectedBoat = companyProjects.find(p => p.id === boatId);
    const isAgencyBooking = selectedBoat && AGENCY_PROJECT_CODES.includes(selectedBoat.code);

    // Map charter type to booking type (only day_charter, overnight_charter, cabin_charter are valid)
    const bookingTypeMap: Record<string, string> = {
      day_charter: 'day_charter',
      overnight_charter: 'overnight_charter',
      cabin_charter: 'cabin_charter',
      other_charter: 'day_charter',
      bareboat_charter: 'overnight_charter',
      crewed_charter: 'overnight_charter',
      outsource_commission: 'day_charter',
    };
    const bookingType = charterType ? bookingTypeMap[charterType] || 'day_charter' : 'day_charter';

    // Build URL parameters for booking calendar
    const params = new URLSearchParams();
    params.set('status', 'booked'); // Receipt -> Booked
    params.set('type', bookingType);
    params.set('title', clientName || '');
    params.set('customerName', clientName || '');

    if (charterDateFrom) params.set('dateFrom', charterDateFrom);
    if (charterDateTo) params.set('dateTo', charterDateTo);
    if (charterTime) params.set('time', charterTime);

    // Set boat info
    if (isAgencyBooking && externalBoatName) {
      params.set('externalBoatName', externalBoatName);
    } else if (selectedBoat) {
      params.set('projectId', selectedBoat.id);
    }

    // Set financial info
    if (documentTotals.totalAmount > 0) {
      params.set('totalPrice', documentTotals.totalAmount.toString());
    }
    params.set('currency', currency);

    // Set source document reference
    if (receiptNumber) {
      params.set('sourceDoc', `Receipt: ${receiptNumber}`);
    }

    // Navigate to booking calendar with new booking form
    router.push(`/bookings/manager/calendar?newBooking=true&${params.toString()}`);
  };

  // Handle Update Description - update first line item with charter info
  const handleUpdateDescription = () => {
    if (lineItems.length === 0) return;

    // Find selected boat name
    const selectedBoat = companyProjects.find(p => p.id === boatId);
    const isAgencyBooking = selectedBoat && AGENCY_PROJECT_CODES.includes(selectedBoat.code);

    // For agency bookings: use external boat name (or leave empty if not provided)
    // For regular bookings: use the selected project name
    const boatName = isAgencyBooking
      ? (externalBoatName || '')
      : (selectedBoat ? `${selectedBoat.code} - ${selectedBoat.name}` : '');

    // Format date range with DD MMM YYYY format
    const formattedFrom = formatDateForDescription(charterDateFrom);
    const formattedTo = formatDateForDescription(charterDateTo);
    const dateRange = charterDateFrom === charterDateTo || !charterDateTo
      ? formattedFrom
      : `${formattedFrom} - ${formattedTo}`;

    // Build structured description
    const description = `Boat: ${boatName}
Charter Date: ${dateRange}
Time: ${charterTime || ''}
Number of guest:
Destination: `;

    // Update first line item
    const updatedItems = [...lineItems];
    updatedItems[0] = {
      ...updatedItems[0],
      description,
      projectId: boatId || updatedItems[0].projectId,
      accountCode: charterType ? charterTypeAccountCodes[charterType as CharterType] : updatedItems[0].accountCode,
    };
    setLineItems(updatedItems);
  };

  // Generate receipt number when company changes (for new receipts)
  useEffect(() => {
    if (!isEditing && companyId && !receiptNumber) {
      // Generate a simple receipt number - format: REC-YYMM-XXXX
      const newNumber = `REC-${getTodayISO().replace(/-/g, '').slice(2, 6)}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      setReceiptNumber(newNumber);
    }
  }, [companyId, isEditing, receiptNumber]);

  // Initialize payments with net amount when creating from invoice
  useEffect(() => {
    if (sourceInvoice && payments.length === 0) {
      setPayments([{
        id: generateId(),
        paymentDate: getTodayISO(),
        amount: Math.round(netAmountToPay * 100) / 100,
        receivedAt: '',
        remark: '',
      }]);
    }
  }, [sourceInvoice, netAmountToPay, payments.length]);

  // Recalculate line items when pricing type changes
  useEffect(() => {
    if (lineItems.length > 0) {
      const updatedItems = lineItems.map((item) => ({
        ...item,
        amount: calculateLineItemTotal(
          item.quantity,
          item.unitPrice,
          item.taxRate,
          effectivePricingType
        ),
      }));
      setLineItems(updatedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePricingType]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showOptionsMenu) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showOptionsMenu]);

  // Auto-fetch exchange rate when currency or receipt date changes
  useEffect(() => {
    const fetchRate = async () => {
      // Skip if THB (no conversion needed)
      if (currency === 'THB') {
        setExchangeRate(1);
        return;
      }

      // Skip if no receipt date set
      if (!receiptDate) return;

      // Skip if editing and rate already set (user may have manually entered)
      if (isEditing && receipt?.fxRate && fxRateSource === 'manual') return;

      setIsFetchingRate(true);
      try {
        const result = await getExchangeRate(currency, receiptDate);
        if (result.success && result.rate) {
          setExchangeRate(result.rate);
          setFxRateSource(result.source || 'bot');
          setFxRateDate(result.date || receiptDate);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchRate();
  }, [currency, receiptDate]);

  // Handle save
  const handleSave = async (status: 'draft' | 'paid') => {
    // Clear previous errors
    setErrors({});

    // Filter out completely empty line items for validation
    const nonEmptyLineItems = lineItems.filter(
      item => item.description.trim() !== '' || item.unitPrice > 0
    );

    // For "Approve" (paid status), do full validation
    if (status === 'paid') {
      const newErrors: Record<string, string> = {};

      if (!companyId) newErrors.companyId = 'Company is required';
      if (!clientId) newErrors.clientId = 'Customer is required';
      if (!receiptDate) newErrors.receiptDate = 'Receipt date is required';

      // Check line items
      const hasValidLineItems = lineItems.some(
        (item) => item.description.trim() !== '' && item.unitPrice > 0
      );
      if (!hasValidLineItems) {
        newErrors.lineItems = 'At least one line item with description and amount is required';
      }

      // Check if all line items have a project selected
      const lineItemsMissingProject = nonEmptyLineItems.some(item => !item.projectId);
      if (lineItemsMissingProject) {
        newErrors.lineItems = 'Project is required for each line item';
      }

      // Check payments
      if (payments.length === 0) {
        newErrors.payments = 'At least one payment record is required';
      } else {
        payments.forEach((payment, index) => {
          if (payment.amount <= 0) {
            newErrors[`payment_${index}_amount`] = 'Amount must be greater than 0';
          }
          if (!payment.receivedAt) {
            newErrors[`payment_${index}_receivedAt`] = 'Select where payment was received';
          }
        });
      }

      // Check adjustment
      if (adjustmentType !== 'none' && adjustmentAmount > 0 && !adjustmentAccountCode) {
        newErrors.adjustmentAccountCode = 'Select an account for the adjustment';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // For draft, require company and project for each line item
    if (status === 'draft') {
      const newErrors: Record<string, string> = {};
      if (!companyId) newErrors.companyId = 'Company is required';

      // Check if any non-empty line items are missing project
      const lineItemsMissingProject = nonEmptyLineItems.some(item => !item.projectId);
      if (lineItemsMissingProject) {
        newErrors.lineItems = 'Project is required for each line item';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    setIsSaving(true);

    try {
      // Generate receipt number if not provided (using company settings)
      let finalReceiptNumber = receiptNumber;
      if (!finalReceiptNumber) {
        finalReceiptNumber = await documentNumbersApi.getNextDocumentNumber(companyId, 'receipt');
      }

      // Build receipt data for database
      const receiptData = {
        company_id: companyId,
        receipt_number: finalReceiptNumber,
        invoice_id: invoiceId || null, // null if not created from invoice
        client_id: clientId || null,
        client_name: clientName,
        receipt_date: receiptDate,
        // Charter information
        boat_id: boatId || null,
        charter_type: charterType || null,
        charter_date_from: charterDateFrom || null,
        charter_date_to: charterDateTo || null,
        charter_time: charterTime || null,
        pricing_type: effectivePricingType,
        subtotal: documentTotals.subtotal,
        tax_amount: documentTotals.taxAmount,
        total_amount: documentTotals.totalAmount,
        currency,
        fx_rate: currency !== 'THB' ? exchangeRate : null,
        fx_rate_source: currency !== 'THB' ? fxRateSource : null,
        fx_base_currency: currency !== 'THB' ? currency : null,
        fx_target_currency: currency !== 'THB' ? 'THB' : null,
        fx_rate_date: currency !== 'THB' ? fxRateDate : null,
        notes: notes || null,
        status,
      };

      // Filter out empty line items and convert to database format
      const nonEmptyLineItems = lineItems.filter(
        item => item.description.trim() !== '' || item.unitPrice > 0
      );
      const lineItemsForDb = nonEmptyLineItems.map((item, index) => ({
        receipt_id: '', // Will be set by API
        project_id: item.projectId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        wht_rate: String(item.whtRate ?? '0'), // WHT rate as string: '0', '1', '2', '3', '5', or 'custom'
        custom_wht_amount: item.whtRate === 'custom' ? (item.customWhtAmount ?? null) : null,
        amount: calculateLineItemTotal(item.quantity, item.unitPrice, item.taxRate, effectivePricingType),
        line_order: index + 1,
      }));

      // Convert payments to database format
      // Note: The original schema uses 'received_at' (stores 'cash' or bank_account_id)
      const paymentRecordsForDb = payments.map(p => ({
        receipt_id: '', // Will be set by API
        payment_date: p.paymentDate,
        amount: p.amount,
        received_at: p.receivedAt || 'cash', // 'cash' or bank_account_id
        remark: p.remark || null,
      }));

      // Create or update receipt
      let savedReceiptId: string | undefined;

      if (isEditing && receipt) {
        // Update receipt header
        await receiptsApi.update(receipt.id, receiptData);
        console.log('Updated receipt');

        // Update line items (delete existing and insert new)
        await receiptsApi.updateLineItems(receipt.id, lineItemsForDb);
        console.log('Updated line items:', lineItemsForDb.length);

        // For payment records, we need to handle them differently
        // First, get existing payment records and delete them
        const existingPayments = await receiptsApi.getPaymentRecords(receipt.id);
        for (const ep of existingPayments) {
          await receiptsApi.deletePaymentRecord(ep.id);
        }
        // Then add the new payment records
        for (const pr of paymentRecordsForDb) {
          await receiptsApi.addPaymentRecord({
            ...pr,
            receipt_id: receipt.id,
          });
        }
        console.log('Updated payment records:', paymentRecordsForDb.length);

        setCurrentStatus(status);
        setIsEditMode(false); // Switch to view mode after save
        savedReceiptId = receipt.id;

        // Create journal entry when updating to paid status
        if (status === 'paid') {
          try {
            const { createReceiptJournalEntry } = await import('@/lib/accounting/journalPostingService');

            const journalResult = await createReceiptJournalEntry(
              {
                receiptId: receipt.id,
                companyId,
                receiptNumber: finalReceiptNumber,
                receiptDate,
                clientName,
                lineItems: nonEmptyLineItems.map(li => ({
                  description: li.description,
                  accountCode: null, // Receipts don't have account codes on line items currently
                  amount: (li.unitPrice * li.quantity),
                })),
                totalSubtotal: documentTotals.subtotal,
                totalVatAmount: documentTotals.taxAmount,
                totalAmount: documentTotals.totalAmount,
                payments: payments.map(p => ({
                  amount: p.amount,
                  bankAccountId: p.receivedAt === 'cash' ? null : p.receivedAt,
                  paymentMethod: p.receivedAt === 'cash' ? 'cash' : 'bank_transfer',
                })),
                currency,
              },
              'system' // createdBy - will be replaced with actual user later
            );

            if (journalResult.success) {
              console.log('Receipt journal entry created:', journalResult.referenceNumber);
            } else {
              console.warn('Journal entry creation warning:', journalResult.error);
            }
          } catch (journalError) {
            console.error('Failed to create receipt journal entry:', journalError);
            // Don't fail the receipt save, just log the error
          }

          // Create WHT tracking records for line items with WHT
          // Check if records already exist for this receipt first
          try {
            const { whtFromCustomerApi } = await import('@/lib/supabase/api/whtFromCustomer');

            // Check if WHT records already exist for this receipt
            const existingRecords = await whtFromCustomerApi.getByReceiptId(receipt.id);

            const whtLineItems = nonEmptyLineItems.filter(item => {
              if (item.whtRate === 'custom' && item.customWhtAmount) return true;
              if (typeof item.whtRate === 'number' && item.whtRate > 0) return true;
              return false;
            });

            // Only create if there are WHT items and no existing records
            if (whtLineItems.length > 0 && existingRecords.length === 0) {
              await whtFromCustomerApi.createFromReceiptLineItems(
                receipt.id,
                companyId,
                clientId || null,
                clientName,
                clientContact?.taxId || null,
                receiptDate,
                currency,
                whtLineItems.map(item => ({
                  id: item.id,
                  description: item.description,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                  whtRate: item.whtRate,
                  customWhtAmount: item.customWhtAmount,
                }))
              );
              console.log('Created WHT tracking records for receipt');
            }
          } catch (whtError) {
            console.warn('Could not create WHT tracking records:', whtError);
            // Don't fail - table might not exist yet (migration not run)
          }
        }
      } else {
        // Create new receipt with line items
        const newReceipt = await receiptsApi.create(receiptData, lineItemsForDb);
        console.log('Created receipt:', newReceipt);
        savedReceiptId = newReceipt?.id;

        // Add payment records
        if (newReceipt) {
          for (const pr of paymentRecordsForDb) {
            await receiptsApi.addPaymentRecord({
              ...pr,
              receipt_id: newReceipt.id,
            });
          }
          console.log('Added payment records:', paymentRecordsForDb.length);
        }

        // Create journal entry for new receipt if status is paid
        if (newReceipt && status === 'paid') {
          try {
            const { createReceiptJournalEntry } = await import('@/lib/accounting/journalPostingService');

            const journalResult = await createReceiptJournalEntry(
              {
                receiptId: newReceipt.id,
                companyId,
                receiptNumber: finalReceiptNumber,
                receiptDate,
                clientName,
                lineItems: nonEmptyLineItems.map(li => ({
                  description: li.description,
                  accountCode: null,
                  amount: (li.unitPrice * li.quantity),
                })),
                totalSubtotal: documentTotals.subtotal,
                totalVatAmount: documentTotals.taxAmount,
                totalAmount: documentTotals.totalAmount,
                payments: payments.map(p => ({
                  amount: p.amount,
                  bankAccountId: p.receivedAt === 'cash' ? null : p.receivedAt,
                  paymentMethod: p.receivedAt === 'cash' ? 'cash' : 'bank_transfer',
                })),
                currency,
              },
              'system'
            );

            if (journalResult.success) {
              console.log('Receipt journal entry created:', journalResult.referenceNumber);
            } else {
              console.warn('Journal entry creation warning:', journalResult.error);
            }
          } catch (journalError) {
            console.error('Failed to create receipt journal entry:', journalError);
          }

          // Create WHT tracking records for line items with WHT
          try {
            const { whtFromCustomerApi } = await import('@/lib/supabase/api/whtFromCustomer');
            const whtLineItems = nonEmptyLineItems.filter(item => {
              if (item.whtRate === 'custom' && item.customWhtAmount) return true;
              if (typeof item.whtRate === 'number' && item.whtRate > 0) return true;
              return false;
            });

            if (whtLineItems.length > 0) {
              await whtFromCustomerApi.createFromReceiptLineItems(
                newReceipt.id,
                companyId,
                clientId || null,
                clientName,
                clientContact?.taxId || null,
                receiptDate,
                currency,
                whtLineItems.map(item => ({
                  id: item.id,
                  description: item.description,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                  whtRate: item.whtRate,
                  customWhtAmount: item.customWhtAmount,
                }))
              );
              console.log('Created WHT tracking records for new receipt');
            }
          } catch (whtError) {
            console.warn('Could not create WHT tracking records:', whtError);
            // Don't fail - table might not exist yet (migration not run)
          }
        }

        // Navigate to edit page for the newly created receipt
        if (newReceipt) {
          router.push(`/accounting/manager/income/receipts/${newReceipt.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Failed to save receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/income/receipts');
    }
  };

  // Handle print/export PDF
  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  // Handle share PDF
  const handleShare = () => {
    alert('Share functionality coming soon! This will allow you to share the PDF via email or other channels.');
  };

  // Handle void receipt with number recycling (Thai accounting compliance)
  const handleVoid = async () => {
    if (!receipt) return;

    setIsSaving(true);
    try {
      // Use the new voidReceipt function that recycles the receipt number
      const result = await receiptsApi.voidReceipt(receipt.id, voidReason || 'No reason provided');

      if (result.numberRecycled) {
        console.log('Receipt number recycled for reuse:', receipt.receiptNumber);
      }

      setCurrentStatus('void');
      setShowVoidModal(false);
      setVoidReason('');
      router.push('/accounting/manager/income/receipts');
    } catch (error) {
      console.error('Error voiding receipt:', error);
      alert('Failed to void receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if document is voided
  const isVoided = currentStatus === 'void';

  // Check if fields should be disabled (view mode for saved documents)
  const isFieldsDisabled = (isEditing && !isEditMode) || isVoided;

  // Show loading state while initial data is being fetched
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
            <FileText className="h-5 w-5 text-[#5A7A8F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Receipt' : 'New Receipt'}
            </h1>
            {isEditing && receipt && (
              <p className="text-sm text-gray-500 mt-0.5">{receipt.receiptNumber}</p>
            )}
            {sourceInvoice && !isEditing && (
              <p className="text-sm text-gray-500 mt-0.5">
                From Invoice: {sourceInvoice.invoiceNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* NEW DOCUMENT: Cancel, Save Draft, Approve */}
          {!isEditing && (
            <>
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
                onClick={() => handleSave('paid')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Approve'}</span>
              </button>
            </>
          )}

          {/* SAVED DOCUMENT: Print, Share, Options dropdown */}
          {isEditing && (
            <>
              {/* Print button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isSaving || !companyId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isSaving || !companyId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>

              {/* Save button - only when in edit mode and not voided */}
              {!isVoided && isEditMode && (
                <button
                  type="button"
                  onClick={() => handleSave(currentStatus === 'draft' ? 'draft' : 'paid')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              )}

              {/* Approved badge */}
              {currentStatus === 'paid' && !isEditMode && (
                <span className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg">
                  Approved
                </span>
              )}

              {/* Draft badge */}
              {currentStatus === 'draft' && !isEditMode && (
                <span className="px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
                  Draft
                </span>
              )}

              {/* Voided badge */}
              {isVoided && (
                <span className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  Voided
                </span>
              )}

              {/* Options dropdown - show when not voided */}
              {!isVoided && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptionsMenu(!showOptionsMenu);
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Options</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showOptionsMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      {/* Edit option - only when not in edit mode */}
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            setIsEditMode(true);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      )}

                      {/* Credit Note option - only for paid receipts */}
                      {currentStatus === 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            router.push(`/accounting/manager/income/credit-notes/new?from=${receipt?.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Credit Note</span>
                        </button>
                      )}

                      {/* Debit Note option - only for paid receipts */}
                      {currentStatus === 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            router.push(`/accounting/manager/income/debit-notes/new?from=${receipt?.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Debit Note</span>
                        </button>
                      )}

                      {/* WHT Summary option - only when there's WHT */}
                      {whtAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            setShowWhtPreview(true);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-gray-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>WHT Summary</span>
                        </button>
                      )}

                      {/* Void option */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setShowVoidModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Void</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document Details Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Document Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Company Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
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

          {/* Receipt Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Number
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to auto-generate</p>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Invoice number, PO number"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Customer Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <ClientSelector
              value={clientId}
              onChange={(id, name) => {
                setClientId(id);
                setClientName(name);
              }}
              required
              disabled={isFieldsDisabled}
            />
            {errors.clientId && (
              <p className="mt-1 text-xs text-red-600">{errors.clientId}</p>
            )}
          </div>

          {/* Receipt Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.receiptDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.receiptDate && (
              <p className="mt-1 text-xs text-red-600">{errors.receiptDate}</p>
            )}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="THB">THB - Thai Baht</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="SGD">SGD - Singapore Dollar</option>
            </select>
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
                  disabled={isFieldsDisabled || isFetchingRate}
                  step="0.0001"
                  placeholder="e.g., 35.50"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  <span className="ml-2 text-green-600">• Bank of Thailand ({fxRateDate || receiptDate})</span>
                )}
                {fxRateSource === 'fallback' && !isFetchingRate && (
                  <span className="ml-2 text-amber-600">• Frankfurt fallback ({fxRateDate || receiptDate})</span>
                )}
                {fxRateSource === 'api' && !isFetchingRate && (
                  <span className="ml-2 text-green-600">• API rate ({fxRateDate || receiptDate})</span>
                )}
                {fxRateSource === 'manual' && !isFetchingRate && (
                  <span className="ml-2 text-gray-600">• Manual rate</span>
                )}
              </p>
              {exchangeRate && documentTotals.totalAmount > 0 && (
                <p className="mt-1 text-xs font-medium text-[#5A7A8F]">
                  THB Total: ฿{(documentTotals.totalAmount * exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          )}

          {/* Pricing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Setting
            </label>
            <select
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value as PricingType)}
              disabled={!isVatAvailable || isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="exclude_vat">Exclude VAT (Add VAT to total)</option>
              <option value="include_vat">Include VAT (VAT included in prices)</option>
              <option value="no_vat">No VAT</option>
            </select>
            {!isVatAvailable && (
              <p className="mt-1 text-xs text-gray-500">Company is not VAT registered</p>
            )}
          </div>
        </div>

        {/* Charter Information Box */}
        <CharterInfoBox
          boatId={boatId}
          charterType={charterType}
          charterDateFrom={charterDateFrom}
          charterDateTo={charterDateTo}
          charterTime={charterTime}
          externalBoatName={externalBoatName}
          projects={companyProjects}
          disabled={isFieldsDisabled}
          onBoatChange={setBoatId}
          onCharterTypeChange={setCharterType}
          onDateFromChange={setCharterDateFrom}
          onDateToChange={setCharterDateTo}
          onTimeChange={setCharterTime}
          onExternalBoatNameChange={setExternalBoatName}
          onUpdateDescription={handleUpdateDescription}
          onAddToBooking={handleAddToBooking}
        />
      </div>

      {/* Line Items Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Line Items
        </h2>

        <LineItemEditor
          lineItems={lineItems}
          onChange={setLineItems}
          pricingType={effectivePricingType}
          currency={currency}
          projects={companyProjects}
          readOnly={isFieldsDisabled}
          exchangeRate={exchangeRate}
        />

        {errors.lineItems && (
          <p className="text-sm text-red-600">{errors.lineItems}</p>
        )}
      </div>

      {/* Payment Records Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Payment Records {payments.length > 0 && `(${payments.length})`}
        </h2>

        <PaymentRecordEditor
          payments={payments}
          onChange={setPayments}
          bankAccounts={companyBankAccounts}
          currency={currency}
          netAmountToPay={netAmountToPay}
          readOnly={isFieldsDisabled}
        />

        {errors.payments && (
          <p className="text-sm text-red-600">{errors.payments}</p>
        )}
      </div>

      {/* Fee/Adjustment Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Fee / Adjustment (Optional)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="none">No Adjustment</option>
              <option value="deduct">Deduct (Bank Fee, etc.)</option>
              <option value="add">Add (Discount, etc.)</option>
            </select>
          </div>

          {adjustmentType !== 'none' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={adjustmentAmount || ''}
                  onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isFieldsDisabled}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account <span className="text-red-500">*</span>
                </label>
                <AccountSelector
                  value={adjustmentAccountCode}
                  onChange={(code) => setAdjustmentAccountCode(code)}
                  accountTypes={['Expense']}
                  placeholder="Select account..."
                  error={!!errors.adjustmentAccountCode}
                  disabled={isFieldsDisabled}
                />
                {errors.adjustmentAccountCode && (
                  <p className="mt-1 text-xs text-red-600">{errors.adjustmentAccountCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark
                </label>
                <input
                  type="text"
                  value={adjustmentRemark}
                  onChange={(e) => setAdjustmentRemark(e.target.value)}
                  placeholder="e.g., Bank transfer fee"
                  disabled={isFieldsDisabled}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </>
          )}
        </div>

        {adjustmentType !== 'none' && adjustmentAmount > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {adjustmentType === 'deduct' ? 'Deducting' : 'Adding'}{' '}
              <span className="font-medium">{formatCurrency(adjustmentAmount, currency)}</span>
              {adjustmentType === 'deduct' ? ' from' : ' to'} total received
            </p>
          </div>
        )}
      </div>

      {/* Receipt Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Receipt Summary
        </h2>

        <div className="flex flex-col items-end space-y-2">
          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Net Amount to Pay:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(netAmountToPay, currency)}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-md">
            <span className="text-sm text-gray-600">Total Payments:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(receiptTotals.totalPayments, currency)}
            </span>
          </div>

          {adjustmentType !== 'none' && adjustmentAmount > 0 && (
            <div className="flex justify-between w-full max-w-md">
              <span className="text-sm text-gray-600">
                {adjustmentType === 'deduct' ? 'Less: Adjustment' : 'Plus: Adjustment'}:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {adjustmentType === 'deduct' ? '-' : '+'}
                {formatCurrency(adjustmentAmount, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between w-full max-w-md border-t pt-2">
            <span className="text-base font-semibold text-gray-900">Total Received:</span>
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(receiptTotals.totalReceived, currency)}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-md">
            <span className="text-base font-semibold text-gray-900">Remaining Amount:</span>
            <span className={`text-base font-bold ${receiptTotals.remainingAmount > 0 ? 'text-amber-600' : receiptTotals.remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(receiptTotals.remainingAmount, currency)}
            </span>
          </div>

          {receiptTotals.remainingAmount !== 0 && (
            <p className={`text-xs ${receiptTotals.remainingAmount > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {receiptTotals.remainingAmount > 0
                ? `${formatCurrency(receiptTotals.remainingAmount, currency)} still outstanding`
                : `${formatCurrency(Math.abs(receiptTotals.remainingAmount), currency)} overpayment`}
            </p>
          )}
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Additional Information
        </h2>

        {/* Notes (Customer-visible) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes / Terms & Conditions
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes that will appear on the receipt..."
            disabled={isFieldsDisabled}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Internal Notes
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes (not visible to customer)..."
            disabled={isFieldsDisabled}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoidModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Void Receipt</h3>
                <p className="text-sm text-gray-500">
                  {receipt?.receiptNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this receipt? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this receipt..."
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowVoidModal(false);
                  setVoidReason('');
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Voiding...' : 'Void Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <ReceiptPrintView
        receipt={{
          receiptNumber: receiptNumber || receipt?.receiptNumber,
          receiptDate,
          reference,
          lineItems,
          pricingType: effectivePricingType,
          subtotal: documentTotals.subtotal,
          taxAmount: documentTotals.taxAmount,
          whtAmount,
          totalAmount: documentTotals.totalAmount,
          payments,
          adjustmentType,
          adjustmentAmount,
          adjustmentRemark,
          netAmountToPay,
          totalPayments: receiptTotals.totalPayments,
          totalReceived: receiptTotals.totalReceived,
          remainingAmount: receiptTotals.remainingAmount,
          currency,
          notes: notes || undefined,
        }}
        company={selectedCompany}
        client={clientContact}
        clientName={clientName}
        bankAccounts={companyBankAccounts}
        createdBy={receipt?.createdBy}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />

      {/* WHT Summary Print View */}
      <WhtReceiptPrintView
        receipt={{
          receiptNumber: receiptNumber || receipt?.receiptNumber,
          receiptDate,
          lineItems,
          pricingType: effectivePricingType,
          subtotal: documentTotals.subtotal,
          taxAmount: documentTotals.taxAmount,
          totalAmount: documentTotals.totalAmount,
          currency,
        }}
        company={selectedCompany}
        client={clientContact}
        clientName={clientName}
        isOpen={showWhtPreview}
        onClose={() => setShowWhtPreview(false)}
      />

      {/* Related Journal Entries - Only show for existing receipts */}
      {isEditing && receipt && (
        <RelatedJournalEntries
          documentType="receipt"
          documentId={receipt.id}
        />
      )}
    </div>
  );
}
