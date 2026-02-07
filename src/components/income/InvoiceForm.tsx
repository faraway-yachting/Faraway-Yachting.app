'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Building2, AlertCircle, Share2, ChevronDown, Receipt, Pencil, Loader2, CheckCircle2 } from 'lucide-react';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import InvoicePrintView from './InvoicePrintView';
import { CharterInfoBox } from './CharterInfoBox';
import type { Invoice, LineItem, PricingType, CharterType } from '@/data/income/types';
import type { Booking, BookingType, BookingStatus } from '@/data/booking/types';
import { BookingFormContainer } from '@/components/bookings/form/BookingFormContainer';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { charterTypeAccountCodes } from '@/data/income/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import type { BankAccount } from '@/data/banking/types';
import type { Contact } from '@/data/contact/types';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { createClient } from '@/lib/supabase/client';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { invoicesApi } from '@/lib/supabase/api/invoices';
import { quotationsApi } from '@/lib/supabase/api/quotations';
import { documentNumbersApi } from '@/lib/supabase/api/documentNumbers';
import { dbCompanyToFrontend, dbProjectToFrontend, dbBankAccountToFrontend, dbContactToFrontend, frontendInvoiceToDb, frontendLineItemToDbInvoice, dbQuotationToFrontend, dbQuotationLineItemToFrontend } from '@/lib/supabase/transforms';
import { getDefaultTermsAndConditions, getDefaultValidityDays } from '@/data/settings/pdfSettings';
import { calculateDocumentTotals, calculateLineItemTotal, calculateTotalWhtAmount, getTodayISO, addDays, generateId } from '@/lib/income/utils';
import { getExchangeRate } from '@/lib/exchangeRate/service';
import type { FxRateSource } from '@/data/exchangeRate/types';

interface CharterPrefill {
  boatId?: string;
  charterType?: string;
  charterDateFrom?: string;
  charterDateTo?: string;
  charterTime?: string;
  customerName?: string;
  currency?: string;
  totalPrice?: number;
  bookingId?: string;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  quotationId?: string; // For pre-filling from quotation
  charterPrefill?: CharterPrefill;
  onCancel?: () => void;
}

export default function InvoiceForm({ invoice, quotationId, charterPrefill, onCancel }: InvoiceFormProps) {
  const router = useRouter();
  const isEditing = !!invoice;

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [companyBankAccounts, setCompanyBankAccounts] = useState<BankAccount[]>([]);
  const [clientContact, setClientContact] = useState<Contact | undefined>(undefined);
  const [sourceQuotation, setSourceQuotation] = useState<{ companyId: string; clientId: string; clientName: string; currency: Currency; pricingType: PricingType; quotationNumber: string; lineItems: LineItem[]; id: string } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<Partial<Booking> | null>(null);

  // Form state - initialized from invoice or defaults (quotation data loaded async)
  const [companyId, setCompanyId] = useState(invoice?.companyId || '');
  const [clientId, setClientId] = useState(invoice?.clientId || '');
  const [clientName, setClientName] = useState(invoice?.clientName || charterPrefill?.customerName || '');
  // Charter information
  const [boatId, setBoatId] = useState(invoice?.boatId || charterPrefill?.boatId || '');
  const [charterType, setCharterType] = useState<CharterType | ''>(invoice?.charterType || (charterPrefill?.charterType as CharterType) || '');
  const [charterDateFrom, setCharterDateFrom] = useState(invoice?.charterDateFrom || invoice?.charterPeriodFrom || charterPrefill?.charterDateFrom || '');
  const [charterDateTo, setCharterDateTo] = useState(invoice?.charterDateTo || invoice?.charterPeriodTo || charterPrefill?.charterDateTo || '');
  const [charterTime, setCharterTime] = useState(invoice?.charterTime || charterPrefill?.charterTime || '');
  const [externalBoatName, setExternalBoatName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoiceDate || getTodayISO());
  const [dueDate, setDueDate] = useState(invoice?.dueDate || addDays(getTodayISO(), getDefaultValidityDays('invoice')));
  const [currency, setCurrency] = useState<Currency>(invoice?.currency || (charterPrefill?.currency as Currency) || 'USD');
  const [pricingType, setPricingType] = useState<PricingType>(invoice?.pricingType || 'exclude_vat');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || [
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unitPrice: charterPrefill?.totalPrice || 0,
        taxRate: 7,
        whtRate: 0,
        customWhtAmount: undefined,
        amount: 0,
        accountCode: '',
        projectId: charterPrefill?.boatId || '',
      },
    ]
  );
  const [notes, setNotes] = useState(invoice?.notes || (isEditing ? '' : getDefaultTermsAndConditions('invoice')));
  const [internalNotes, setInternalNotes] = useState(invoice?.internalNotes || '');
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || '');
  const [reference, setReference] = useState(invoice?.reference || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(
    invoice?.fxRate
  );
  const [fxRateSource, setFxRateSource] = useState<FxRateSource>(
    invoice?.fxRateSource || 'bot'
  );
  const [fxRateDate, setFxRateDate] = useState<string | undefined>(undefined);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [currentStatus, setCurrentStatus] = useState(invoice?.status || 'draft');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  // Load initial data (companies and optionally quotation)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load companies
        const companiesData = await companiesApi.getActive();
        setCompanies(companiesData.map(dbCompanyToFrontend));

        // Load quotation data if creating from quotation
        if (quotationId) {
          const quotationWithItems = await quotationsApi.getByIdWithLineItems(quotationId);
          if (quotationWithItems) {
            const lineItemsData = quotationWithItems.line_items?.map(item => ({
              ...dbQuotationLineItemToFrontend(item),
              id: generateId(),
            })) || [];

            const quotationData = {
              id: quotationWithItems.id,
              companyId: quotationWithItems.company_id,
              clientId: quotationWithItems.client_id || '',
              clientName: quotationWithItems.client_name,
              currency: (quotationWithItems.currency || 'USD') as Currency,
              pricingType: (quotationWithItems.pricing_type || 'exclude_vat') as PricingType,
              quotationNumber: quotationWithItems.quotation_number,
              lineItems: lineItemsData,
            };
            setSourceQuotation(quotationData);

            // Pre-fill form from quotation
            setCompanyId(quotationData.companyId);
            setClientId(quotationData.clientId);
            setClientName(quotationData.clientName);
            setCurrency(quotationData.currency);
            setPricingType(quotationData.pricingType);
            setReference(quotationData.quotationNumber);
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
  }, [quotationId]);

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

  // Generate invoice number when company is selected (for new documents only)
  useEffect(() => {
    const generateNumber = async () => {
      if (!companyId || isEditing || invoiceNumber) return;
      try {
        const nextNumber = await documentNumbersApi.getNextDocumentNumber(companyId, 'invoice');
        setInvoiceNumber(nextNumber);
      } catch (error) {
        console.error('Failed to generate invoice number:', error);
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

  // Get bank account matching selected company and currency
  const paymentBankAccount = companyBankAccounts.find((ba) => ba.currency === currency);

  // Check if VAT is available for selected company
  const isVatAvailable = selectedCompany?.isVatRegistered ?? true;

  // Force "No VAT" if company is not VAT registered
  const effectivePricingType = !isVatAvailable ? 'no_vat' : pricingType;

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

  // Auto-fetch exchange rate when currency or date changes
  useEffect(() => {
    const fetchRate = async () => {
      // Skip if THB (no conversion needed)
      if (currency === 'THB') {
        setExchangeRate(1);
        return;
      }

      // Skip if no date set
      if (!invoiceDate) return;

      // Skip if editing and rate already set (user may have manually entered)
      if (isEditing && invoice?.fxRate && fxRateSource === 'manual') return;

      setIsFetchingRate(true);
      try {
        const result = await getExchangeRate(currency, invoiceDate);
        if (result.success && result.rate) {
          setExchangeRate(result.rate);
          setFxRateSource(result.source || 'bot');
          setFxRateDate(result.date || invoiceDate);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchRate();
  }, [currency, invoiceDate]);

  // Calculate totals
  const totals = calculateDocumentTotals(lineItems, effectivePricingType);
  const whtAmount = calculateTotalWhtAmount(lineItems, effectivePricingType);

  // Auto-prefill project in line items when boat is selected
  useEffect(() => {
    if (!boatId) return;
    setLineItems(prev => prev.map(item =>
      !item.projectId ? { ...item, projectId: boatId } : item
    ));
  }, [boatId]);

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
  // Invoice -> Hold status
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

    // Build prefilled booking object
    const prefilled: Partial<Booking> = {
      status: 'hold' as BookingStatus,
      type: bookingType as BookingType,
      title: clientName || '',
      customerName: clientName || '',
      dateFrom: charterDateFrom || undefined,
      dateTo: charterDateTo || undefined,
      time: charterTime || undefined,
      projectId: (isAgencyBooking ? undefined : selectedBoat?.id) || undefined,
      externalBoatName: isAgencyBooking ? externalBoatName : undefined,
      totalPrice: totals.totalAmount > 0 ? totals.totalAmount : undefined,
      currency: currency as Currency,
      internalNotes: invoiceNumber ? `Source: Invoice ${invoiceNumber}` : undefined,
    };
    setPrefilledBooking(prefilled);
    setShowBookingModal(true);
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

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyId) newErrors.companyId = 'Company is required';
    if (!clientId) newErrors.clientId = 'Customer is required';
    if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required';

    // Date validation
    if (dueDate && invoiceDate && dueDate < invoiceDate) {
      newErrors.dueDate = 'Due date must be on or after invoice date';
    }

    // Line items validation
    lineItems.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        newErrors[`lineItem_${index}_description`] = 'Description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`lineItem_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`lineItem_${index}_unitPrice`] = 'Unit price cannot be negative';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async (status: 'draft' | 'issued') => {
    // Clear previous errors
    setErrors({});

    // Filter out completely empty line items (no description and no price)
    const nonEmptyLineItems = lineItems.filter(
      item => item.description.trim() !== '' || item.unitPrice > 0
    );

    // For "Issue" (issued status), do full validation
    if (status === 'issued') {
      const newErrors: Record<string, string> = {};

      if (!companyId) newErrors.companyId = 'Company is required';
      if (!clientId) newErrors.clientId = 'Customer is required';
      if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';

      // Check if there are valid line items
      if (nonEmptyLineItems.length === 0) {
        newErrors.lineItems = 'At least one line item with description or price is required';
      }

      // Check if all line items have a project selected
      const lineItemsMissingProject = nonEmptyLineItems.some(item => !item.projectId);
      if (lineItemsMissingProject) {
        newErrors.lineItems = 'Project is required for each line item';
      }

      // Date validation
      if (dueDate && invoiceDate && dueDate < invoiceDate) {
        newErrors.dueDate = 'Due date must be on or after invoice date';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Scroll to top to show errors
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
      const finalLineItems = nonEmptyLineItems.length > 0 ? nonEmptyLineItems : lineItems;

      // Generate invoice number if not provided (using company settings)
      let finalInvoiceNumber = invoiceNumber;
      if (!finalInvoiceNumber) {
        finalInvoiceNumber = await documentNumbersApi.getNextDocumentNumber(companyId, 'invoice');
      }

      const invoiceData: Partial<Invoice> = {
        companyId,
        clientId,
        clientName,
        quotationId: sourceQuotation?.id || invoice?.quotationId,
        invoiceNumber: finalInvoiceNumber,
        // Charter information
        boatId: boatId || undefined,
        charterType: charterType || undefined,
        charterDateFrom: charterDateFrom || undefined,
        charterDateTo: charterDateTo || undefined,
        charterTime: charterTime || undefined,
        invoiceDate,
        dueDate,
        currency,
        pricingType: effectivePricingType,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        // FX Rate fields
        fxRate: currency !== 'THB' ? exchangeRate : undefined,
        fxRateSource: currency !== 'THB' ? fxRateSource : undefined,
        thbSubtotal: currency !== 'THB' && exchangeRate ? totals.subtotal * exchangeRate : undefined,
        thbTaxAmount: currency !== 'THB' && exchangeRate ? totals.taxAmount * exchangeRate : undefined,
        thbTotalAmount: currency !== 'THB' && exchangeRate ? totals.totalAmount * exchangeRate : undefined,
        amountPaid: 0,
        amountOutstanding: totals.totalAmount,
        reference: reference || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        status,
        issuedDate: status === 'issued' ? getTodayISO() : undefined,
      };

      // Convert to DB format
      const dbInvoice = frontendInvoiceToDb(invoiceData);
      if (charterPrefill?.bookingId) {
        (dbInvoice as Record<string, unknown>).booking_id = charterPrefill.bookingId;
      }
      const dbLineItems = finalLineItems.map(item => frontendLineItemToDbInvoice(item, ''));

      // Create or update invoice
      if (isEditing && invoice) {
        await invoicesApi.update(invoice.id, dbInvoice);
        await invoicesApi.updateLineItems(invoice.id, dbLineItems);
        console.log('Updated invoice');
        setCurrentStatus(status);
        setIsEditMode(false); // Switch to view mode after save
      } else {
        const newInvoice = await invoicesApi.create(dbInvoice, dbLineItems);
        console.log('Created invoice:', newInvoice);
        // Link invoice to booking if created from booking form
        if (newInvoice && charterPrefill?.bookingId) {
          try {
            await bookingsApi.update(charterPrefill.bookingId, {
              invoiceId: newInvoice.id,
              paymentStatus: 'awaiting_payment',
            });
          } catch (linkErr) {
            console.error('Failed to link invoice to booking:', linkErr);
          }
        }
        // Navigate to edit page for the newly created invoice
        if (newInvoice) {
          router.push(`/accounting/manager/income/invoices/${newInvoice.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/accounting/manager/income/invoices');
    }
  };

  // Handle print/export PDF
  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  // Handle share PDF (placeholder for API integration)
  const handleShare = () => {
    // TODO: Connect with share API
    // This will generate PDF and share via email or other channels
    alert('Share functionality coming soon! This will allow you to share the PDF via email or other channels.');
  };

  // Handle void invoice
  const handleVoid = async () => {
    if (!invoice) return;

    setIsSaving(true);
    try {
      await invoicesApi.update(invoice.id, {
        status: 'void',
        notes: voidReason ? `${internalNotes}\n\nVoid Reason: ${voidReason}` : (internalNotes || null),
      });

      setCurrentStatus('void');
      setShowVoidModal(false);
      setVoidReason('');
      // Optionally navigate back to list
      router.push('/accounting/manager/income/invoices');
    } catch (error) {
      console.error('Error voiding invoice:', error);
      alert('Failed to void invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle approve (draft → issued)
  const handleApprove = async () => {
    if (!invoice) return;

    // Validate before approving
    const newErrors: Record<string, string> = {};
    if (!companyId) newErrors.companyId = 'Company is required';
    if (!clientId) newErrors.clientId = 'Customer is required';
    if (!invoiceDate) newErrors.invoiceDate = 'Invoice date is required';

    const nonEmptyLineItems = lineItems.filter(
      item => item.description.trim() !== '' || item.unitPrice > 0
    );
    if (nonEmptyLineItems.length === 0) {
      newErrors.lineItems = 'At least one line item with description or price is required';
    }
    const lineItemsMissingProject = nonEmptyLineItems.some(item => !item.projectId);
    if (lineItemsMissingProject) {
      newErrors.lineItems = 'Project is required for each line item';
    }
    if (dueDate && invoiceDate && dueDate < invoiceDate) {
      newErrors.dueDate = 'Due date must be on or after invoice date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    try {
      await invoicesApi.update(invoice.id, {
        status: 'issued',
      } as any);
      setCurrentStatus('issued');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error approving invoice:', error);
      alert('Failed to approve invoice. Please try again.');
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
              {isEditing ? 'Edit Invoice' : 'New Invoice'}
            </h1>
            {isEditing && invoice && (
              <p className="text-sm text-gray-500 mt-0.5">{invoice.invoiceNumber}</p>
            )}
            {sourceQuotation && !isEditing && (
              <p className="text-sm text-gray-500 mt-0.5">
                From Quotation: {sourceQuotation.quotationNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* NEW DOCUMENT: Cancel, Save Draft, Save */}
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
                onClick={() => handleSave('issued')}
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

              {/* Edit/Save toggle - only when not voided */}
              {!isVoided && (
                isEditMode ? (
                  <button
                    type="button"
                    onClick={() => handleSave(currentStatus === 'draft' ? 'draft' : 'issued')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )
              )}

              {/* Approve button - only for draft invoices when not in edit mode */}
              {currentStatus === 'draft' && !isEditMode && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSaving ? 'Approving...' : 'Approve'}</span>
                </button>
              )}

              {/* Voided badge - show instead of Options when voided */}
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
                      {/* Create Receipt */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          router.push(`/accounting/manager/income/receipts/new?from=${invoice?.id}`);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Receipt className="h-4 w-4" />
                        <span>Create Receipt</span>
                      </button>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to auto-generate</p>
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

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <CurrencySelect
              value={currency}
              onChange={(val) => setCurrency(val as Currency)}
              disabled={isFieldsDisabled}
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
                  <span className="ml-2 text-green-600">• Bank of Thailand ({fxRateDate || invoiceDate})</span>
                )}
                {fxRateSource === 'fallback' && !isFetchingRate && (
                  <span className="ml-2 text-amber-600">• Frankfurt fallback ({fxRateDate || invoiceDate})</span>
                )}
                {fxRateSource === 'api' && !isFetchingRate && (
                  <span className="ml-2 text-green-600">• API rate ({fxRateDate || invoiceDate})</span>
                )}
                {fxRateSource === 'manual' && !isFetchingRate && (
                  <span className="ml-2 text-gray-600">• Manual rate</span>
                )}
              </p>
              {exchangeRate && totals.totalAmount > 0 && (
                <p className="mt-1 text-xs font-medium text-[#5A7A8F]">
                  THB Total: ฿{(totals.totalAmount * exchangeRate).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.invoiceDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.invoiceDate && (
              <p className="mt-1 text-xs text-red-600">{errors.invoiceDate}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isFieldsDisabled}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.dueDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
            )}
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
              placeholder="e.g., PO-12345"
              disabled={isFieldsDisabled}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Pricing Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pricing Type
          </label>
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 ${isFieldsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                value="exclude_vat"
                checked={effectivePricingType === 'exclude_vat'}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                disabled={!isVatAvailable || isFieldsDisabled}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${!isVatAvailable || isFieldsDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                Exclude VAT (prices net, VAT added)
              </span>
            </label>

            <label className={`flex items-center gap-2 ${isFieldsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                value="include_vat"
                checked={effectivePricingType === 'include_vat'}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                disabled={!isVatAvailable || isFieldsDisabled}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${!isVatAvailable || isFieldsDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                Include VAT (prices gross, VAT extracted)
              </span>
            </label>

            <label className={`flex items-center gap-2 ${isFieldsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                value="no_vat"
                checked={effectivePricingType === 'no_vat'}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                disabled={isFieldsDisabled}
                className="w-4 h-4 text-[#5A7A8F] focus:ring-[#5A7A8F] disabled:opacity-50"
              />
              <span className={`text-sm ${isFieldsDisabled ? 'text-gray-400' : 'text-gray-700'}`}>No VAT</span>
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

      {/* Payment Details Section */}
      {companyId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
            Payment Details
          </h2>

          {paymentBankAccount ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Bank Name</p>
                  <p className="text-sm text-gray-900">{paymentBankAccount.bankInformation.bankName}</p>
                </div>
              </div>

              {paymentBankAccount.bankInformation.bankBranch && (
                <div className="flex items-start gap-3">
                  <div className="w-5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Branch</p>
                    <p className="text-sm text-gray-900">{paymentBankAccount.bankInformation.bankBranch}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Name</p>
                  <p className="text-sm text-gray-900">{paymentBankAccount.accountName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Number</p>
                  <p className="text-sm text-gray-900 font-mono">{paymentBankAccount.accountNumber}</p>
                </div>
              </div>

              {paymentBankAccount.bankInformation.swiftBic && (
                <div className="flex items-start gap-3">
                  <div className="w-5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">SWIFT/BIC</p>
                    <p className="text-sm text-gray-900 font-mono">{paymentBankAccount.bankInformation.swiftBic}</p>
                  </div>
                </div>
              )}

              {paymentBankAccount.iban && (
                <div className="flex items-start gap-3">
                  <div className="w-5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">IBAN</p>
                    <p className="text-sm text-gray-900 font-mono">{paymentBankAccount.iban}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  No bank account found for {currency} currency
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Please add a {currency} account in Settings → Bank Accounts for the selected company.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Additional Information
        </h2>

        {/* Notes (Customer-visible) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Terms & Conditions
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Enter terms and conditions that will appear on the invoice..."
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
                <h3 className="text-lg font-semibold text-gray-900">Void Invoice</h3>
                <p className="text-sm text-gray-500">
                  {invoice?.invoiceNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to void this invoice? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for voiding (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding this invoice..."
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
                {isSaving ? 'Voiding...' : 'Void Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <InvoicePrintView
        invoice={{
          invoiceNumber: invoiceNumber || invoice?.invoiceNumber,
          invoiceDate,
          dueDate,
          lineItems,
          pricingType: effectivePricingType,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          whtAmount,
          currency,
          notes: notes || undefined,
        }}
        company={selectedCompany}
        client={clientContact}
        clientName={clientName}
        bankAccount={paymentBankAccount}
        createdBy={invoice?.createdBy}
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />

      {/* Inline Booking Modal */}
      {showBookingModal && (
        <BookingFormContainer
          prefilled={prefilledBooking}
          projects={companyProjects}
          onSave={async (bookingData) => {
            const now = new Date();
            const yr = now.getFullYear();
            const mo = String(now.getMonth() + 1).padStart(2, '0');
            const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            const bookingNumber = `FA-${yr}${mo}${seq}`;
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const dataWithDefaults = {
              ...bookingData,
              bookingNumber,
              bookingOwner: bookingData.bookingOwner || user?.id || undefined,
            };
            await bookingsApi.create(dataWithDefaults);
            setShowBookingModal(false);
            setPrefilledBooking(null);
          }}
          onClose={() => {
            setShowBookingModal(false);
            setPrefilledBooking(null);
          }}
        />
      )}
    </div>
  );
}
