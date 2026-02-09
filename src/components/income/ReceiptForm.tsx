'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Save, FileText, Printer, XCircle, Share2, ChevronDown, Pencil, Loader2, Upload, Trash2, Download, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ClientSelector from './ClientSelector';
import LineItemEditor from './LineItemEditor';
import PaymentRecordEditor from './PaymentRecordEditor';
import ReceiptPrintView from './ReceiptPrintView';
import WhtReceiptPrintView from './WhtReceiptPrintView';
import AccountSelector from '@/components/common/AccountSelector';
import { RelatedJournalEntries } from '@/components/accounting/RelatedJournalEntries';
import { CharterInfoBox } from './CharterInfoBox';
import { RevenueRecognitionStatus } from './RevenueRecognitionStatus';
import type { Receipt, PaymentRecord, AdjustmentType, LineItem, PricingType, CharterType } from '@/data/income/types';
import type { Booking, BookingType, BookingStatus } from '@/data/booking/types';
import { BookingFormContainer } from '@/components/bookings/form/BookingFormContainer';
import { bookingsApi, createBookingWithNumber } from '@/lib/supabase/api/bookings';
import { charterTypeAccountCodes } from '@/data/income/types';
import type { Currency, Company } from '@/data/company/types';
import type { Project } from '@/data/project/types';
import type { BankAccount } from '@/data/banking/types';
import type { Contact } from '@/data/contact/types';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { companiesApi } from '@/lib/supabase/api/companies';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { beamMerchantAccountsApi } from '@/lib/supabase/api/beamMerchantAccounts';
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
import { generateReceiptPdf, uploadReceiptPdf, type ReceiptPdfData } from '@/lib/pdf/generateReceiptPdf';

export interface CharterPrefill {
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

interface ReceiptFormProps {
  receipt?: Receipt;
  invoiceId?: string; // For pre-filling from invoice
  charterPrefill?: CharterPrefill;
  onCancel?: () => void;
}

export default function ReceiptForm({ receipt, invoiceId, charterPrefill, onCancel }: ReceiptFormProps) {
  const router = useRouter();
  const isEditing = !!receipt;

  // Current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Async loaded data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [companyBankAccounts, setCompanyBankAccounts] = useState<BankAccount[]>([]);
  const [beamGateways, setBeamGateways] = useState<Array<{ id: string; merchantName: string; merchantId: string }>>([]);
  const [clientContact, setClientContact] = useState<Contact | undefined>(undefined);
  const [sourceInvoice, setSourceInvoice] = useState<{ companyId: string; clientId: string; clientName: string; currency: Currency; pricingType: PricingType; invoiceNumber: string; lineItems: LineItem[] } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<Partial<Booking> | null>(null);

  // Form state - initialized from receipt or defaults (invoice data loaded async)
  const [companyId, setCompanyId] = useState(receipt?.companyId || '');
  const [clientId, setClientId] = useState(receipt?.clientId || '');
  const [clientName, setClientName] = useState(receipt?.clientName || charterPrefill?.customerName || '');
  // Charter information
  const [boatId, setBoatId] = useState(receipt?.boatId || charterPrefill?.boatId || '');
  const [charterType, setCharterType] = useState<CharterType | ''>(receipt?.charterType || (charterPrefill?.charterType as CharterType) || '');
  const [charterDateFrom, setCharterDateFrom] = useState(receipt?.charterDateFrom || charterPrefill?.charterDateFrom || '');
  const [charterDateTo, setCharterDateTo] = useState(receipt?.charterDateTo || charterPrefill?.charterDateTo || '');
  const [charterTime, setCharterTime] = useState(receipt?.charterTime || charterPrefill?.charterTime || '');
  const [externalBoatName, setExternalBoatName] = useState('');
  const [receiptDate, setReceiptDate] = useState(receipt?.receiptDate || getTodayISO());
  const [currency, setCurrency] = useState<Currency>(receipt?.currency || (charterPrefill?.currency as Currency) || 'USD');
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

  // Attachment state
  interface ReceiptAttachment {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }
  const [attachments, setAttachments] = useState<ReceiptAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<ReceiptAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

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
        setBeamGateways([]);
        return;
      }
      try {
        const [bankAccountsData, gatewaysData] = await Promise.all([
          bankAccountsApi.getByCompanyActive(companyId),
          beamMerchantAccountsApi.getActive(),
        ]);
        setCompanyBankAccounts(bankAccountsData.map(dbBankAccountToFrontend));
        setBeamGateways(
          gatewaysData
            .filter((gw: any) => gw.company_id === companyId)
            .map((gw: any) => ({ id: gw.id, merchantName: gw.merchant_name, merchantId: gw.merchant_id }))
        );
      } catch (error) {
        console.error('Failed to load company data:', error);
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

  // Load existing attachments when editing
  useEffect(() => {
    const loadAttachments = async () => {
      if (!isEditing || !receipt?.id) return;
      try {
        // Fetch receipt with attachments from database
        // Note: attachments column added in migration 038, types may not be updated
        const supabase = createClient();
        const { data } = await supabase
          .from('receipts')
          .select('*')
          .eq('id', receipt.id)
          .single();

        // Cast data to include attachments field (column added in migration 038)
        const receiptData = data as typeof data & { attachments?: ReceiptAttachment[] | null };
        if (receiptData?.attachments && Array.isArray(receiptData.attachments)) {
          setAttachments(receiptData.attachments);
        }
      } catch (error) {
        console.error('Failed to load attachments:', error);
      }
    };
    loadAttachments();
  }, [isEditing, receipt?.id]);

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

    // Build prefilled booking object
    const prefilled: Partial<Booking> = {
      status: 'booked' as BookingStatus,
      type: bookingType as BookingType,
      title: clientName || '',
      customerName: clientName || '',
      dateFrom: charterDateFrom || undefined,
      dateTo: charterDateTo || undefined,
      time: charterTime || undefined,
      projectId: (isAgencyBooking ? undefined : selectedBoat?.id) || undefined,
      externalBoatName: isAgencyBooking ? externalBoatName : undefined,
      totalPrice: documentTotals.totalAmount > 0 ? documentTotals.totalAmount : undefined,
      currency: currency as Currency,
      internalNotes: receiptNumber ? `Source: Receipt ${receiptNumber}` : undefined,
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

  // Handle file upload for attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const supabase = createClient();

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          alert(`File type not supported: ${file.name}. Allowed types: JPG, PNG, GIF, PDF`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File too large: ${file.name}. Maximum size is 10MB`);
          continue;
        }

        // Generate unique file path
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop();
        const receiptIdForPath = receipt?.id || 'temp';
        const filePath = `receipt-attachments/${receiptIdForPath}/${timestamp}-${randomId}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('Documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload failed:', uploadError);
          alert(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('Documents')
          .getPublicUrl(filePath);

        // Add to attachments state
        const newAttachment: ReceiptAttachment = {
          id: `${timestamp}-${randomId}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
        };
        setAttachments(prev => [...prev, newAttachment]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle attachment delete
  const handleDeleteAttachment = async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    // Confirm deletion
    if (!confirm(`Delete attachment "${attachment.name}"?`)) return;

    // Try to delete from storage
    const supabase = createClient();
    const urlMatch = attachment.url.match(/\/storage\/v1\/object\/public\/Documents\/(.+)/);
    if (urlMatch) {
      const filePath = urlMatch[1];
      await supabase.storage.from('Documents').remove([filePath]);
    }

    // Remove from state
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if attachment is an image
  const isImageAttachment = (attachment: ReceiptAttachment): boolean => {
    return attachment.type.startsWith('image/');
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
      // Always generate a fresh receipt number at save time to avoid duplicates
      // (The pre-filled number might be stale if another receipt was created in the meantime)
      let finalReceiptNumber = receiptNumber;
      if (!isEditing) {
        // For new receipts, always get a fresh number to avoid collisions
        finalReceiptNumber = await documentNumbersApi.getNextDocumentNumber(companyId, 'receipt');
        // Update the form state so it shows the actual number used
        setReceiptNumber(finalReceiptNumber);
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
        attachments: attachments.length > 0 ? attachments : null,
        booking_id: charterPrefill?.bookingId || null,
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
        try {
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
        } catch (paymentError) {
          const errMsg = paymentError instanceof Error ? paymentError.message : JSON.stringify(paymentError);
          console.error('Failed to update payment records:', errMsg, paymentError);
          // Continue - receipt was updated, payment records can be fixed manually
        }

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
              currentUserId || '' // createdBy - actual user ID
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

          // Auto-generate and upload receipt PDF
          try {
            // Build company address string
            const companyAddr = selectedCompany?.registeredAddress;
            const companyAddressStr = companyAddr
              ? [companyAddr.street, companyAddr.city, companyAddr.state, companyAddr.postalCode, companyAddr.country].filter(Boolean).join(', ')
              : undefined;

            // Build client address string
            const clientAddr = clientContact?.billingAddress;
            const clientAddressStr = clientAddr
              ? [clientAddr.street, clientAddr.city, clientAddr.state, clientAddr.postalCode, clientAddr.country].filter(Boolean).join(', ')
              : undefined;

            const pdfData: ReceiptPdfData = {
              receiptNumber: finalReceiptNumber,
              receiptDate,
              reference,
              companyName: selectedCompany?.name || '',
              companyAddress: companyAddressStr,
              companyPhone: selectedCompany?.contactInformation?.phoneNumber,
              companyEmail: selectedCompany?.contactInformation?.email,
              companyTaxId: selectedCompany?.taxId,
              isVatRegistered: selectedCompany?.isVatRegistered,
              clientName,
              clientAddress: clientAddressStr,
              clientEmail: clientContact?.email,
              clientTaxId: clientContact?.taxId,
              charterType: charterType || undefined,
              charterDateFrom: charterDateFrom || undefined,
              charterDateTo: charterDateTo || undefined,
              charterTime: charterTime || undefined,
              lineItems: nonEmptyLineItems.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: calculateLineItemTotal(item.quantity, item.unitPrice, item.taxRate, effectivePricingType),
                taxRate: item.taxRate,
                whtRate: item.whtRate,
                customWhtAmount: item.customWhtAmount,
              })),
              pricingType: effectivePricingType,
              subtotal: documentTotals.subtotal,
              taxAmount: documentTotals.taxAmount,
              whtAmount,
              totalAmount: documentTotals.totalAmount,
              netAmountToPay: documentTotals.totalAmount - whtAmount,
              currency,
              payments: payments.map(p => ({
                date: p.paymentDate,
                amount: p.amount,
                method: p.receivedAt === 'cash' ? 'Cash' : p.receivedAt.startsWith('beam:') ? `Beam - ${beamGateways.find(gw => gw.id === p.receivedAt.slice(5))?.merchantName || 'Gateway'}` : (companyBankAccounts.find(b => b.id === p.receivedAt)?.accountName || 'Bank Transfer'),
                remark: p.remark,
              })),
              notes,
            };

            const pdfBytes = await generateReceiptPdf(pdfData);
            const uploadResult = await uploadReceiptPdf(pdfBytes, receipt.id, finalReceiptNumber);

            if (uploadResult) {
              // Add the generated PDF to attachments
              const pdfAttachment: ReceiptAttachment = {
                id: `auto-pdf-${Date.now()}`,
                name: uploadResult.name,
                size: pdfBytes.length,
                type: 'application/pdf',
                url: uploadResult.url,
              };

              // Update attachments in state and database
              const updatedAttachments = [...attachments, pdfAttachment];
              setAttachments(updatedAttachments);

              // Update receipt with new attachment (cast to bypass TypeScript - column added in migration 038)
              const supabase = createClient();
              await supabase
                .from('receipts')
                .update({ attachments: updatedAttachments } as Record<string, unknown>)
                .eq('id', receipt.id);

              console.log('Auto-generated receipt PDF uploaded:', uploadResult.name);
            }
          } catch (pdfError) {
            console.warn('Could not auto-generate receipt PDF:', pdfError);
            // Don't fail the save - PDF generation is optional
          }
        }
      } else {
        // Create new receipt with line items, payment records, and journal entry (if paid)
        // Use retry logic in case of duplicate key (race condition with another user)
        let newReceipt;
        let journalResult: { success: boolean; journalEntryId?: string; referenceNumber?: string; error?: string } | null = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            const result = await receiptsApi.createWithJournalEntry(
              receiptData,
              lineItemsForDb,
              paymentRecordsForDb,
              currentUserId || ''
            );
            newReceipt = result.receipt;
            journalResult = result.journalResult;
            break; // Success, exit loop
          } catch (createError: unknown) {
            const errorObj = createError as { code?: string; message?: string };
            // Check if it's a duplicate key error (code 23505)
            if (errorObj?.code === '23505' && errorObj?.message?.includes('receipt_number')) {
              retries++;
              if (retries < maxRetries) {
                // Generate a new receipt number and retry
                console.warn(`Receipt number collision, regenerating... (attempt ${retries + 1})`);
                finalReceiptNumber = await documentNumbersApi.getNextDocumentNumber(companyId, 'receipt');
                receiptData.receipt_number = finalReceiptNumber;
                setReceiptNumber(finalReceiptNumber);
              } else {
                throw createError; // Max retries reached
              }
            } else {
              throw createError; // Not a duplicate key error
            }
          }
        }

        console.log('Created receipt:', newReceipt);
        savedReceiptId = newReceipt?.id;

        // Log journal entry result and alert user if failed
        if (journalResult) {
          if (journalResult.success) {
            console.log('Receipt journal entry created:', journalResult.referenceNumber);
          } else {
            console.error('[ReceiptForm] Journal entry creation failed:', journalResult.error);
            // Show warning to user - receipt was saved but journal entry wasn't created
            alert(`Receipt saved, but journal entry creation failed: ${journalResult.error}\n\nPlease check the browser console (F12) for details.`);
          }
        } else if (status === 'paid') {
          // If status is paid but no journal result, something went wrong
          console.error('[ReceiptForm] Journal result is null for paid receipt');
        }

        // Create WHT tracking records for line items with WHT
        if (newReceipt) {
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

          // Auto-generate and upload receipt PDF for new paid receipt
          try {
            // Build company address string
            const companyAddr = selectedCompany?.registeredAddress;
            const companyAddressStr = companyAddr
              ? [companyAddr.street, companyAddr.city, companyAddr.state, companyAddr.postalCode, companyAddr.country].filter(Boolean).join(', ')
              : undefined;

            // Build client address string
            const clientAddr = clientContact?.billingAddress;
            const clientAddressStr = clientAddr
              ? [clientAddr.street, clientAddr.city, clientAddr.state, clientAddr.postalCode, clientAddr.country].filter(Boolean).join(', ')
              : undefined;

            const pdfData: ReceiptPdfData = {
              receiptNumber: finalReceiptNumber,
              receiptDate,
              reference,
              companyName: selectedCompany?.name || '',
              companyAddress: companyAddressStr,
              companyPhone: selectedCompany?.contactInformation?.phoneNumber,
              companyEmail: selectedCompany?.contactInformation?.email,
              companyTaxId: selectedCompany?.taxId,
              isVatRegistered: selectedCompany?.isVatRegistered,
              clientName,
              clientAddress: clientAddressStr,
              clientEmail: clientContact?.email,
              clientTaxId: clientContact?.taxId,
              charterType: charterType || undefined,
              charterDateFrom: charterDateFrom || undefined,
              charterDateTo: charterDateTo || undefined,
              charterTime: charterTime || undefined,
              lineItems: nonEmptyLineItems.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: calculateLineItemTotal(item.quantity, item.unitPrice, item.taxRate, effectivePricingType),
                taxRate: item.taxRate,
                whtRate: item.whtRate,
                customWhtAmount: item.customWhtAmount,
              })),
              pricingType: effectivePricingType,
              subtotal: documentTotals.subtotal,
              taxAmount: documentTotals.taxAmount,
              whtAmount,
              totalAmount: documentTotals.totalAmount,
              netAmountToPay: documentTotals.totalAmount - whtAmount,
              currency,
              payments: payments.map(p => ({
                date: p.paymentDate,
                amount: p.amount,
                method: p.receivedAt === 'cash' ? 'Cash' : p.receivedAt.startsWith('beam:') ? `Beam - ${beamGateways.find(gw => gw.id === p.receivedAt.slice(5))?.merchantName || 'Gateway'}` : (companyBankAccounts.find(b => b.id === p.receivedAt)?.accountName || 'Bank Transfer'),
                remark: p.remark,
              })),
              notes,
            };

            const pdfBytes = await generateReceiptPdf(pdfData);
            const uploadResult = await uploadReceiptPdf(pdfBytes, newReceipt.id, finalReceiptNumber);

            if (uploadResult) {
              // Add the generated PDF to attachments in database (cast to bypass TypeScript - column added in migration 038)
              const pdfAttachment = {
                id: `auto-pdf-${Date.now()}`,
                name: uploadResult.name,
                size: pdfBytes.length,
                type: 'application/pdf',
                url: uploadResult.url,
              };

              const supabase = createClient();
              await supabase
                .from('receipts')
                .update({ attachments: [pdfAttachment] } as Record<string, unknown>)
                .eq('id', newReceipt.id);

              console.log('Auto-generated receipt PDF uploaded for new receipt:', uploadResult.name);
            }
          } catch (pdfError) {
            console.warn('Could not auto-generate receipt PDF:', pdfError);
            // Don't fail the save - PDF generation is optional
          }
        }

        // Link receipt to booking and auto-update statuses
        if (newReceipt && charterPrefill?.bookingId) {
          try {
            const updates: Record<string, unknown> = {
              depositReceiptId: newReceipt.id,
            };
            // If receipt is paid, auto-set booking payment status to paid
            if (status === 'paid') {
              updates.paymentStatus = 'paid';
              // Promote booking status to 'booked' if currently enquiry/hold
              const currentBooking = await bookingsApi.getById(charterPrefill.bookingId);
              if (currentBooking && ['enquiry', 'hold'].includes(currentBooking.status)) {
                updates.status = 'booked';
              }
            }
            await bookingsApi.update(charterPrefill.bookingId, updates);
          } catch (linkErr) {
            console.error('Failed to link receipt to booking:', linkErr);
          }
        }

        // Navigate to edit page for the newly created receipt
        if (newReceipt) {
          router.push(`/accounting/manager/income/receipts/${newReceipt.id}`);
        }
      }
    } catch (error: unknown) {
      console.error('Error saving receipt:', error);
      // Extract error message from various error types including Supabase PostgrestError
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const err = error as { message?: string; details?: string; hint?: string; code?: string };
        errorMessage = err.message || err.details || err.hint || err.code || 'Database error';
      }
      alert(`Failed to save receipt: ${errorMessage}`);
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              )}

              {/* Approve button - only for draft receipts in edit mode */}
              {!isVoided && isEditMode && currentStatus === 'draft' && (
                <button
                  type="button"
                  onClick={() => handleSave('paid')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Approving...' : 'Approve'}</span>
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

                      {/* Approve option - only for draft receipts when not in edit mode */}
                      {!isEditMode && currentStatus === 'draft' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            setIsEditMode(true);
                            // Small delay to allow edit mode to enable, then trigger approve
                            setTimeout(() => handleSave('paid'), 100);
                          }}
                          disabled={isSaving}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          <span>Approve</span>
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

        {/* Revenue Recognition Status */}
        <RevenueRecognitionStatus
          charterDateTo={charterDateTo}
          receiptStatus={currentStatus}
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
          beamGateways={beamGateways}
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

      {/* Receipt Attachments Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">
          Receipt Attachments
        </h2>

        {/* Upload area */}
        {!isFieldsDisabled && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-[#5A7A8F] hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="receipt-attachment-input"
            />
            <label
              htmlFor="receipt-attachment-input"
              className={`cursor-pointer flex flex-col items-center gap-2 ${isUploading ? 'cursor-not-allowed' : ''}`}
            >
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-gray-500">
                PDF, JPG, PNG, GIF (max 10MB per file)
              </span>
            </label>
          </div>
        )}

        {/* Attachments list */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Thumbnail or icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  {isImageAttachment(attachment) ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-red-500" />
                  )}
                </div>

                {/* File info */}
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewingAttachment(attachment)}
                    className="p-1.5 text-gray-500 hover:text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <a
                    href={attachment.url}
                    download={attachment.name}
                    className="p-1.5 text-gray-500 hover:text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {!isFieldsDisabled && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {attachments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            No attachments yet
          </p>
        )}
      </div>

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setViewingAttachment(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 truncate pr-4">
                  {viewingAttachment.name}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={viewingAttachment.url}
                    download={viewingAttachment.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <button
                    onClick={() => setViewingAttachment(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-120px)] overflow-auto">
                {isImageAttachment(viewingAttachment) ? (
                  <img
                    src={viewingAttachment.url}
                    alt={viewingAttachment.name}
                    className="max-w-full max-h-[calc(90vh-180px)] object-contain rounded shadow-lg"
                  />
                ) : viewingAttachment.type === 'application/pdf' ? (
                  <iframe
                    src={viewingAttachment.url}
                    className="w-full h-[calc(90vh-180px)] rounded shadow-lg"
                    title={viewingAttachment.name}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">{viewingAttachment.name}</p>
                    <a
                      href={viewingAttachment.url}
                      download={viewingAttachment.name}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f]"
                    >
                      <Download className="h-4 w-4" />
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Inline Booking Modal */}
      {showBookingModal && (
        <BookingFormContainer
          prefilled={prefilledBooking}
          projects={companyProjects}
          onSave={async (bookingData) => {
            await createBookingWithNumber({
              ...bookingData,
              bookingOwner: bookingData.bookingOwner || currentUserId || undefined,
            });
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
