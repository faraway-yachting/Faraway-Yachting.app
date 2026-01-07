import { Currency } from '@/data/company/types';

// ============================================================================
// Common Types
// ============================================================================

export type AccountType = 'cash' | 'bank' | 'e-wallet';

export interface FinancesPeriod {
  year: number;
  month: number; // 1-12
}

// ============================================================================
// Cash Flow Calendar (Tab 1: Overview)
// ============================================================================

export interface CashFlowTransaction {
  id: string;
  date: string; // ISO date
  type: 'in' | 'out';
  amount: number;
  description: string;
  category: string;
  sourceDocument?: string; // Invoice, Receipt, etc.
  companyId: string;
  companyName: string;
}

export interface DailyCashFlow {
  date: string; // ISO date
  cashIn: number;
  cashOut: number;
  netMovement: number; // cashIn - cashOut
  transactions: CashFlowTransaction[];
}

export interface MonthlyCashFlowSummary {
  month: string; // YYYY-MM
  totalIn: number;
  totalOut: number;
  netMovement: number;
  openingBalance: number;
  closingBalance: number;
}

// ============================================================================
// Account Balances (Tab 2: Cash/Bank/e-Wallet)
// ============================================================================

export interface AccountBalance {
  id: string;
  accountId: string; // Link to bank account or chart of accounts
  accountName: string;
  accountType: AccountType;
  companyId: string;
  companyName: string;
  currency: Currency;
  openingBalance: number;
  openingBalanceDate: string;
  currentBalance: number;
  asOfDate: string;
  movements: {
    totalIn: number;
    totalOut: number;
  };
  glAccountCode: string;
  isActive: boolean;
}

export interface AccountBalanceGroup {
  type: AccountType;
  label: string;
  accounts: AccountBalance[];
  totalBalance: number;
}

// ============================================================================
// WHT from Customer (Tab 3)
// ============================================================================

export type WhtFromCustomerStatus = 'pending' | 'received' | 'reconciled';

export interface WhtFromCustomer {
  id: string;
  date: string; // ISO date
  documentNumber: string; // Receipt number that triggered WHT
  documentType: 'receipt';
  customerId: string;
  customerName: string;
  customerTaxId?: string;
  companyId: string;
  companyName: string;
  invoiceAmount: number;
  whtRate: number; // Percentage (e.g., 3 for 3%)
  whtAmount: number;
  whtCertificateNumber?: string;
  status: WhtFromCustomerStatus;
  period: string; // YYYY-MM
  currency: Currency;
}

export interface WhtFromCustomerSummary {
  period: string; // YYYY-MM
  companyId: string;
  companyName: string;
  totalWhtAmount: number;
  transactionCount: number;
  status: 'pending' | 'partial' | 'complete';
}

// ============================================================================
// WHT to Supplier (Tab 4)
// ============================================================================

export type WhtFormType = 'pnd3' | 'pnd53';
export type WhtToSupplierStatus = 'pending' | 'submitted' | 'filed';

export interface WhtToSupplier {
  id: string;
  date: string; // ISO date
  documentNumber: string; // Payment voucher number
  documentType: 'payment';
  supplierId: string;
  supplierName: string;
  supplierTaxId: string;
  companyId: string;
  companyName: string;
  paymentAmount: number;
  whtType: WhtFormType; // PND3 for individuals, PND53 for companies
  whtRate: number;
  whtAmount: number;
  whtCertificateNumber?: string;
  status: WhtToSupplierStatus;
  submissionDate?: string;
  period: string; // YYYY-MM
  currency: Currency;
  expenseRecordIds?: string[]; // Links to expense records for descriptions
}

export interface WhtToSupplierSummary {
  period: string; // YYYY-MM
  companyId: string;
  companyName: string;
  pnd3Amount: number;
  pnd53Amount: number;
  totalWhtAmount: number;
  transactionCount: number;
  dueDate: string;
  status: WhtToSupplierStatus;
}

// ============================================================================
// VAT Transactions (Tab 5)
// ============================================================================

export type VatDirection = 'input' | 'output';

export interface VatTransaction {
  id: string;
  date: string; // ISO date
  documentNumber: string;
  documentType: 'invoice' | 'receipt' | 'credit_note' | 'debit_note' | 'expense';
  direction: VatDirection;
  companyId: string;
  companyName: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyTaxId: string;
  baseAmount: number; // Pre-VAT amount
  vatRate: number; // Percentage (e.g., 7 for 7%)
  vatAmount: number;
  totalAmount: number;
  period: string; // YYYY-MM
  currency: Currency;
  glAccountCode: string; // 1170 for VAT Receivable, 2200 for VAT Payable
}

export interface VatPeriodSummary {
  period: string; // YYYY-MM
  companyId: string;
  companyName: string;
  vatInput: number; // Sum of input VAT (purchases)
  vatOutput: number; // Sum of output VAT (sales)
  netVat: number; // vatOutput - vatInput
  status: 'payable' | 'refundable' | 'zero';
  dueDate: string;
  filingStatus: 'pending' | 'filed' | 'paid';
}

// ============================================================================
// Filter Types
// ============================================================================

export interface FinancesFilters {
  dataScope: string; // "all-companies" | "company-{id}"
  period: FinancesPeriod;
  currency?: Currency;
}
