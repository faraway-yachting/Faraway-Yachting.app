/**
 * Chart of Accounts for Faraway Yachting
 *
 * This file contains the complete chart of accounts with 220+ accounts
 * organized by type (Asset, Liability, Equity, Revenue, Expense).
 *
 * Data source: Faraway_Yachting_COA_V1_Corrected.csv
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type NormalBalance = 'Debit' | 'Credit';
export type Currency = 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED';

export interface ChartOfAccount {
  code: string;
  name: string;
  accountType: AccountType;
  subType: string;
  category: string;
  normalBalance: NormalBalance;
  description: string;
  balance?: number;
  currency?: Currency;
  isActive?: boolean;
}

export const chartOfAccounts: ChartOfAccount[] = [
  // ASSETS - Current Assets - Cash & Equivalents
  { code: "1000", name: "Petty Cash THB", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Petty Cash THB Asset Current Asset Cash & Equivalents.", currency: "THB" },
  { code: "1001", name: "Petty Cash EUR", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Petty Cash EUR Asset Current Asset Cash & Equivalents.", currency: "EUR" },
  { code: "1002", name: "Petty Cash USD ", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Petty Cash USD Asset Current Asset Cash & Equivalents.", currency: "USD" },
  { code: "1010", name: "Bank Account THB", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Bank Account THB Asset Current Asset Cash & Equivalents.", currency: "THB" },
  { code: "1011", name: "Bank Account EUR", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Bank Account EUR Asset Current Asset Cash & Equivalents.", currency: "EUR" },
  { code: "1012", name: "Bank Account USD", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Bank Account USD Asset Current Asset Cash & Equivalents.", currency: "USD" },
  { code: "1013", name: "Bank Account SGD", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Bank Account SGD Asset Current Asset Cash & Equivalents.", currency: "SGD" },
  { code: "1020", name: "Cash on hand THB ", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Cash on hand THB Asset Current Asset Cash & Equivalents.", currency: "THB" },
  { code: "1021", name: "Cash on hand EUR ", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Cash on hand EUR Asset Current Asset Cash & Equivalents.", currency: "EUR" },
  { code: "1022", name: "Cash on hand USD", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Cash on hand USD Asset Current Asset Cash & Equivalents.", currency: "USD" },
  { code: "1030", name: "Security Deposits Bank Account THB", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Security Deposits Bank Account THB Asset Current Asset Cash & Equivalents.", currency: "THB" },
  { code: "1031", name: "Security Deposits Bank Account EUR", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Security Deposits Bank Account EUR Asset Current Asset Cash & Equivalents.", currency: "EUR" },
  { code: "1032", name: "Security Deposits Bank Account USD", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Security Deposits Bank Account USD Asset Current Asset Cash & Equivalents.", currency: "USD" },
  { code: "1035", name: "Escrow Accounts", accountType: "Asset", subType: "Current Asset", category: "Cash & Equivalents", normalBalance: "Debit", description: "Escrow accounts for client funds" },
  { code: "1060", name: "Short-Term Investments", accountType: "Asset", subType: "Current Asset", category: "Investments & Other", normalBalance: "Debit", description: "Short-Term Investments Asset Current Asset Cash & Equivalents." },

  // ASSETS - Current Assets - Receivables
  { code: "1140", name: "Credit Card Receivables", accountType: "Asset", subType: "Current Asset", category: "Receivables", normalBalance: "Debit", description: "Credit Card Receivables Asset Current Asset Receivables." },
  { code: "1150", name: "Employee Advances", accountType: "Asset", subType: "Current Asset", category: "Receivables", normalBalance: "Debit", description: "Employee Advances Asset Current Asset Receivables." },
  { code: "1160", name: "Insurance Claims Receivable", accountType: "Asset", subType: "Current Asset", category: "Receivables", normalBalance: "Debit", description: "Insurance Claims Receivable Asset Current Asset Receivables." },
  { code: "1170", name: "VAT Receivable", accountType: "Asset", subType: "Current Asset", category: "Receivables", normalBalance: "Debit", description: "VAT Receivable Asset Current Asset Receivables." },
  { code: "1180", name: "Other Receivables", accountType: "Asset", subType: "Current Asset", category: "Receivables", normalBalance: "Debit", description: "Other Receivables Asset Current Asset Receivables." },

  // ASSETS - Current Assets - Inventory & Prepaid
  { code: "1200", name: "Inventory", accountType: "Asset", subType: "Current Asset", category: "Inventory", normalBalance: "Debit", description: "Inventory Asset Current Asset Inventory." },
  { code: "1300", name: "Prepaid Expenses Asset Current Asset Prepaid Expenses", accountType: "Asset", subType: "Current Asset", category: "Prepaid Expenses", normalBalance: "Debit", description: "Prepaid Expenses Asset Current Asset Prepaid Expenses." },

  // ASSETS - Non-Current Assets - Property & Equipment
  { code: "1400", name: "Vessels", accountType: "Asset", subType: "Non-Current Asset", category: "Investments & Other", normalBalance: "Debit", description: "Vessels Asset Non-Current Asset Vessels." },
  { code: "1500", name: "Boat Equipment", accountType: "Asset", subType: "Non-Current Asset", category: "Property & Equipment", normalBalance: "Debit", description: "Boat Equipment Asset Non-Current Asset Property & Equipment." },
  { code: "1510", name: "Office Equipment", accountType: "Asset", subType: "Non-Current Asset", category: "Property & Equipment", normalBalance: "Debit", description: "Office Equipment Asset Non-Current Asset Property & Equipment." },
  { code: "1560", name: "Vehicles", accountType: "Asset", subType: "Non-Current Asset", category: "Property & Equipment", normalBalance: "Debit", description: "Vehicles Asset Non-Current Asset Property & Equipment." },

  // ASSETS - Non-Current Assets - Intangible Assets
  { code: "1610", name: "Trademarks & Brand Names", accountType: "Asset", subType: "Non-Current Asset", category: "Intangible Assets", normalBalance: "Debit", description: "Trademarks & Brand Names Asset Non-Current Asset Intangible Assets." },
  { code: "1620", name: "Charter Licenses & Permits", accountType: "Asset", subType: "Non-Current Asset", category: "Intangible Assets", normalBalance: "Debit", description: "Charter Licenses & Permits Asset Non-Current Asset Intangible Assets." },
  { code: "1630", name: "Software & Technology", accountType: "Asset", subType: "Non-Current Asset", category: "Intangible Assets", normalBalance: "Debit", description: "Software & Technology Asset Non-Current Asset Intangible Assets." },
  { code: "1710", name: "Goodwill", accountType: "Asset", subType: "Non-Current Asset", category: "Intangible Assets", normalBalance: "Debit", description: "Goodwill from business acquisitions" },

  // ASSETS - Non-Current Assets - Investments & Other
  { code: "1730", name: "Security Deposits Paid", accountType: "Asset", subType: "Non-Current Asset", category: "Investments & Other", normalBalance: "Debit", description: "Security Deposits Paid Asset Non-Current Asset Investments & Other." },
  { code: "1740", name: "Deferred Tax Assets ", accountType: "Asset", subType: "Non-Current Asset", category: "Investments & Other", normalBalance: "Debit", description: "Deferred Tax Assets Asset Non-Current Asset Investments & Other." },
  { code: "1760", name: "Long-Term Investments", accountType: "Asset", subType: "Non-Current Asset", category: "Investments & Other", normalBalance: "Debit", description: "Long-Term Investments." },
  { code: "1790", name: "Other Non-Current", accountType: "Asset", subType: "Non-Current Asset", category: "Investments & Other", normalBalance: "Debit", description: "Other Non-Current Assets Asset Non-Current Asset Investments & Other." },

  // LIABILITIES - Current Liabilities - Payables
  { code: "2010", name: "Accounts Payable - Fuel Suppliers", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Accounts Payable - Fuel Suppliers Liability Current Liability Payables." },
  { code: "2020", name: "Accounts Payable - Provisions/Catering", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Accounts Payable - Provisions/Catering Liability Current Liability Payables." },
  { code: "2030", name: "Accounts Payable - Marina & Port Fees", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Accounts Payable - Marina & Port Fees Liability Current Liability Payables." },
  { code: "2040", name: "Accounts Payable - Maintenance & Repairs", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Accounts Payable - Maintenance & Repairs Liability Current Liability Payables." },
  { code: "2050", name: "Accounts Payable - Professional Services", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Accounts Payable - Professional Services Liability Current Liability Payables." },
  { code: "2060", name: "Credit Cards Payable", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Credit Cards Payable Liability Current Liability Payables." },
  { code: "2070", name: "Intercompany Payables", accountType: "Liability", subType: "Current Liability", category: "Payables", normalBalance: "Credit", description: "Intercompany Payables Liability Current Liability Payables." },

  // LIABILITIES - Current Liabilities - Accrued Expenses
  { code: "2100", name: "Accrued Wages & Salaries", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Wages & Salaries Liability Current Liability Accrued Expenses." },
  { code: "2110", name: "Accrued Crew Wages", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Crew Wages Liability Current Liability Accrued Expenses." },
  { code: "2130", name: "Accrued Bonuses", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Bonuses Liability Current Liability Accrued Expenses." },
  { code: "2140", name: "Accrued Interest", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Interest Liability Current Liability Accrued Expenses." },
  { code: "2150", name: "Accrued Professional Fees", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Professional Fees Liability Current Liability Accrued Expenses." },
  { code: "2160", name: "Accrued Utilities", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Utilities Liability Current Liability Accrued Expenses." },
  { code: "2170", name: "Accrued Repairs & Maintenance", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Accrued Repairs & Maintenance Liability Current Liability Accrued Expenses." },
  { code: "2190", name: "Other Accrued Expenses", accountType: "Liability", subType: "Current Liability", category: "Accrued Expenses", normalBalance: "Credit", description: "Other Accrued Expenses Liability Current Liability Accrued Expenses." },

  // LIABILITIES - Current Liabilities - Taxes & Withholdings
  { code: "2200", name: "VAT/GST Payable", accountType: "Liability", subType: "Current Liability", category: "Taxes & Withholdings", normalBalance: "Credit", description: "VAT/GST Payable Liability Current Liability Taxes & Withholdings." },
  { code: "2210", name: "Income Tax Payable", accountType: "Liability", subType: "Current Liability", category: "Taxes & Withholdings", normalBalance: "Credit", description: "Income Tax Payable Liability Current Liability Taxes & Withholdings." },
  { code: "2220", name: "Employee Income Tax Withholding Payable", accountType: "Liability", subType: "Current Liability", category: "Taxes & Withholdings", normalBalance: "Credit", description: "Employee income tax withheld pending remittance" },
  { code: "2230", name: "Social Security Contributions Payable", accountType: "Liability", subType: "Current Liability", category: "Taxes & Withholdings", normalBalance: "Credit", description: "Social Security Contributions Payable Liability Current Liability Taxes & Withholdings." },
  { code: "2240", name: "Withholdings Payable", accountType: "Liability", subType: "Current Liability", category: "Taxes & Withholdings", normalBalance: "Credit", description: "Withholdings Payable Liability Current Liability Taxes & Withholdings." },
  { code: "2290", name: "Other Taxes Payable", accountType: "Liability", subType: "Current Liability", category: "Taxes & Withholdings", normalBalance: "Credit", description: "Other Taxes Payable Liability Current Liability Taxes & Withholdings." },

  // LIABILITIES - Current Liabilities - Deferred Revenue & Deposits
  { code: "2300", name: "Charter Deposits Received", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Deferred Charter Revenue Liability Current Liability Deferred Revenue & Deposits." },
  { code: "2330", name: "Security Deposits Held", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Security Deposits Held Liability Current Liability Deferred Revenue & Deposits." },
  { code: "2340", name: "Gift Cards/Vouchers Outstanding", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Gift Cards/Vouchers Outstanding Liability Current Liability Deferred Revenue & Deposits." },
  { code: "2350", name: "Deferred Commission Income", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Deferred Commission Income Liability Current Liability Deferred Revenue & Deposits." },
  { code: "2390", name: "Other Deferred Revenue", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Other Deferred Revenue Liability Current Liability Deferred Revenue & Deposits." },

  // LIABILITIES - Current Liabilities - Short-Term Debt
  { code: "2400", name: "Short-Term Bank Loans", accountType: "Liability", subType: "Current Liability", category: "Short-Term Debt", normalBalance: "Credit", description: "Short-Term Bank Loans Liability Current Liability Short-Term Debt." },
  { code: "2410", name: "Current Portion of Long-Term Debt", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Current Portion of Long-Term Debt Liability Current Liability Short-Term Debt." },
  { code: "2420", name: "Current Portion of Vessel Financing", accountType: "Liability", subType: "Current Liability", category: "Short-Term Debt", normalBalance: "Credit", description: "Current Portion of Vessel Financing Liability Current Liability Short-Term Debt." },
  { code: "2430", name: "Lines of Credit Liability Current", accountType: "Liability", subType: "Current Liability", category: "Short-Term Debt", normalBalance: "Credit", description: "Lines of Credit Liability Current Liability Short-Term Debt." },
  { code: "2490", name: "Other Short-Term Borrowings", accountType: "Liability", subType: "Current Liability", category: "Short-Term Debt", normalBalance: "Credit", description: "Other Short-Term Borrowings Liability Current Liability Short-Term Debt." },

  // LIABILITIES - Non-Current Liabilities - Long-Term Debt
  { code: "2500", name: "Long-Term Bank Loans", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Long-Term Bank Loans Liability Non-Current Liability Long-Term Debt." },
  { code: "2510", name: "Vessel Mortgage Loans", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Vessel Mortgage Loans Liability Non-Current Liability Long-Term Debt." },
  { code: "2520", name: "Equipment Financing", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Equipment Financing Liability Non-Current Liability Long-Term Debt." },
  { code: "2530", name: "Bonds Payable ", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Bonds Payable Liability Non-Current Liability Long-Term Debt." },
  { code: "2540", name: "Notes Payable - Long-Term", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Notes Payable - Long-Term Liability Non-Current Liability Long-Term Debt." },
  { code: "2550", name: "Shareholder Loans Liability", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Shareholder Loans Liability Non-Current Liability Long-Term Debt." },
  { code: "2590", name: "Other Long-Term Debt Liability", accountType: "Liability", subType: "Non-Current Liability", category: "Long-Term Debt", normalBalance: "Credit", description: "Other Long-Term Debt Liability Non-Current Liability Long-Term Debt." },

  // LIABILITIES - Non-Current Liabilities - Other
  { code: "2600", name: "Deferred Tax Liabilities", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Deferred Tax Liabilities Liability Non-Current Liability Other Non-Current Liabilities." },
  { code: "2610", name: "Long-Term Security Deposits", accountType: "Liability", subType: "Current Liability", category: "Deferred Revenue & Deposits", normalBalance: "Credit", description: "Long-Term Security Deposits Liability Non-Current Liability Other Non-Current Liabilities." },
  { code: "2630", name: "Provisions for Vessel Overhauls Liability", accountType: "Liability", subType: "Non-Current Liability", category: "Other Non-Current Liabilities", normalBalance: "Credit", description: "Provisions for Vessel Overhauls Liability Non-Current Liability Other Non-Current Liabilities." },
  { code: "2640", name: "Environmental Provisions", accountType: "Liability", subType: "Non-Current Liability", category: "Other Non-Current Liabilities", normalBalance: "Credit", description: "Environmental Provisions Liability Non-Current Liability Other Non-Current Liabilities." },
  { code: "2690", name: "Other Non-Current Liabilities", accountType: "Liability", subType: "Non-Current Liability", category: "Other Non-Current Liabilities", normalBalance: "Credit", description: "Other Non-Current Liabilities Liability Non-Current Liability Other Non-Current Liabilities." },

  // EQUITY - Share Capital
  { code: "3000", name: "Ordinary Share Capital", accountType: "Equity", subType: "Share Capital", category: "Share Capital", normalBalance: "Credit", description: "Ordinary Share Capital Equity Share Capital Share Capital." },
  { code: "3010", name: "Preference Share Capital", accountType: "Equity", subType: "Share Capital", category: "Share Capital", normalBalance: "Credit", description: "Preference Share Capital Equity Share Capital Share Capital." },
  { code: "3020", name: "Share Premium/Additional Paid-In Capital", accountType: "Equity", subType: "Share Capital", category: "Share Capital", normalBalance: "Credit", description: "Share Premium/Additional Paid-In Capital Equity Share Capital Share Capital." },
  { code: "3030", name: "Treasury Shares", accountType: "Equity", subType: "Share Capital", category: "Share Capital", normalBalance: "Debit", description: "Treasury Shares Equity Share Capital Share Capital." },

  // EQUITY - Reserves
  { code: "3100", name: "Legal Reserve", accountType: "Equity", subType: "Reserves", category: "Reserves", normalBalance: "Credit", description: "Legal Reserve Equity Reserves Reserves." },
  { code: "3110", name: "Capital Reserve", accountType: "Equity", subType: "Reserves", category: "Reserves", normalBalance: "Credit", description: "Capital Reserve Equity Reserves Reserves." },
  { code: "3120", name: "Revaluation Reserve Equity", accountType: "Equity", subType: "Reserves", category: "Reserves", normalBalance: "Credit", description: "Revaluation Reserve Equity Reserves Reserves." },
  { code: "3130", name: "Foreign Currency Translation Reserve", accountType: "Equity", subType: "Reserves", category: "Reserves", normalBalance: "Credit", description: "Foreign Currency Translation Reserve Equity Reserves Reserves." },
  { code: "3150", name: "Share-Based Payment Reserve", accountType: "Equity", subType: "Reserves", category: "Reserves", normalBalance: "Credit", description: "Share-Based Payment Reserve Equity Reserves Reserves." },

  // EQUITY - Retained Earnings
  { code: "3200", name: "Retained Earnings - Prior Years", accountType: "Equity", subType: "Retained Earnings", category: "Retained Earnings", normalBalance: "Credit", description: "Retained Earnings - Prior Years Equity Retained Earnings Retained Earnings." },
  { code: "3210", name: "Current Year Earnings", accountType: "Equity", subType: "Retained Earnings", category: "Retained Earnings", normalBalance: "Credit", description: "Current Year Earnings Equity Retained Earnings Retained Earnings." },
  { code: "3220", name: "Dividends Declared", accountType: "Equity", subType: "Retained Earnings", category: "Retained Earnings", normalBalance: "Debit", description: "Dividends Declared Equity Retained Earnings Retained Earnings." },

  // EQUITY - Other
  { code: "3310", name: "Owner's Drawings", accountType: "Equity", subType: "Other Equity", category: "Other Equity", normalBalance: "Debit", description: "Owner's Drawings Equity Other Equity Other Equity." },
  { code: "3320", name: "Owner's Contributions", accountType: "Equity", subType: "Other Equity", category: "Other Equity", normalBalance: "Credit", description: "Owner's Contributions Equity Other Equity Other Equity." },

  // REVENUE - Operating Revenue - Charter Revenue
  { code: "4010", name: "Charter Revenue - Day Charters", accountType: "Revenue", subType: "Operating Revenue", category: "Charter Revenue", normalBalance: "Credit", description: "Charter Revenue - Day Charters Revenue Operating Revenue Charter Revenue." },
  { code: "4020", name: "Charter Revenue - Overnight charter", accountType: "Revenue", subType: "Operating Revenue", category: "Charter Revenue", normalBalance: "Credit", description: "Charter Revenue - Overnight charter Revenue Operating Revenue Charter Revenue." },
  { code: "4030", name: "Charter Revenue - Cabin charter", accountType: "Revenue", subType: "Operating Revenue", category: "Charter Revenue", normalBalance: "Credit", description: "Charter Revenue - Cabin charter." },
  { code: "4040", name: "Other charter Revenue", accountType: "Revenue", subType: "Operating Revenue", category: "Charter Revenue", normalBalance: "Credit", description: "Other Revenue." },
  { code: "4050", name: "Commission Revenue - Bareboat charter", accountType: "Revenue", subType: "Operating Revenue", category: "Commission Revenue", normalBalance: "Credit", description: "Commission Revenue - Bareboat charter Commission Revenue Operating Revenue Charter Revenue." },
  { code: "4060", name: "Commission Revenue - Crewed charter", accountType: "Revenue", subType: "Operating Revenue", category: "Commission Revenue", normalBalance: "Credit", description: "Commission Revenue - Crewed charter Commission Revenue Operating Revenue Charter Revenue." },
  { code: "4070", name: "Commission Revenue - Outsouce services Comission", accountType: "Revenue", subType: "Operating Revenue", category: "Commission Revenue", normalBalance: "Credit", description: "Commission Revenue - Outsouce services Comission." },
  { code: "4080", name: "Other commission", accountType: "Revenue", subType: "Operating Revenue", category: "Commission Revenue", normalBalance: "Credit", description: "Other commission." },
  { code: "4090", name: "Charter Cancellation Fees", accountType: "Revenue", subType: "Operating Revenue", category: "Charter Revenue", normalBalance: "Credit", description: "Charter Cancellation Fees Revenue Operating Revenue Charter Revenue." },
  { code: "4095", name: "Charter Amendment Fees", accountType: "Revenue", subType: "Operating Revenue", category: "Charter Revenue", normalBalance: "Credit", description: "Charter Amendment Fees Revenue Operating Revenue Charter Revenue." },

  // REVENUE - Operating Revenue - Ancillary Revenue
  { code: "4100", name: "Food & Beverage Revenue", accountType: "Revenue", subType: "Operating Revenue", category: "Ancillary Revenue", normalBalance: "Credit", description: "Food & Beverage Revenue Revenue Operating Revenue Ancillary Revenue." },
  { code: "4190", name: "Merchandise Sales", accountType: "Revenue", subType: "Operating Revenue", category: "Ancillary Revenue", normalBalance: "Credit", description: "Merchandise Sales Revenue Operating Revenue Ancillary Revenue." },

  // REVENUE - Operating Revenue - Management & Brokerage
  { code: "4300", name: "Yacht Management Fees", accountType: "Revenue", subType: "Operating Revenue", category: "Management & Brokerage Revenue", normalBalance: "Credit", description: "Yacht Management Fees Revenue Operating Revenue Management & Brokerage Revenue." },
  { code: "4320", name: "Yacht Sales Commissions", accountType: "Revenue", subType: "Operating Revenue", category: "Management & Brokerage Revenue", normalBalance: "Credit", description: "Yacht Sales Commissions Revenue Operating Revenue Management & Brokerage Revenue." },
  { code: "4330", name: "Consultancy Fees Revenue", accountType: "Revenue", subType: "Operating Revenue", category: "Management & Brokerage Revenue", normalBalance: "Credit", description: "Consultancy Fees Revenue Operating Revenue Management & Brokerage Revenue." },

  // REVENUE - Operating Revenue - Other Operating Revenue
  { code: "4410", name: "Insurance Recoveries Revenue", accountType: "Revenue", subType: "Operating Revenue", category: "Other Operating Revenue", normalBalance: "Credit", description: "Insurance Recoveries Revenue Operating Revenue Other Operating Revenue." },
  { code: "4420", name: "Damage Deposit Forfeitures", accountType: "Revenue", subType: "Operating Revenue", category: "Other Operating Revenue", normalBalance: "Credit", description: "Damage Deposit Forfeitures Revenue Operating Revenue Other Operating Revenue." },
  { code: "4430", name: "Late Payment Fees", accountType: "Revenue", subType: "Operating Revenue", category: "Other Operating Revenue", normalBalance: "Credit", description: "Late Payment Fees Revenue Operating Revenue Other Operating Revenue." },
  { code: "4440", name: "Training & Certification Revenue", accountType: "Revenue", subType: "Operating Revenue", category: "Other Operating Revenue", normalBalance: "Credit", description: "Training & Certification Revenue Revenue Operating Revenue Other Operating Revenue." },
  { code: "4490", name: "Other Operating Revenue", accountType: "Revenue", subType: "Operating Revenue", category: "Other Operating Revenue", normalBalance: "Credit", description: "Other Operating Revenue Revenue Operating Revenue Other Operating Revenue." },

  // REVENUE - Non-Operating Revenue
  { code: "4500", name: "Interest Income", accountType: "Revenue", subType: "Non-Operating Revenue", category: "Non-Operating Revenue", normalBalance: "Credit", description: "Interest Income Revenue Non-Operating RevenueNon-Operating Revenue." },
  { code: "4510", name: "Dividend Income", accountType: "Revenue", subType: "Non-Operating Revenue", category: "Non-Operating Revenue", normalBalance: "Credit", description: "Dividend Income Revenue Non-Operating RevenueNon-Operating Revenue." },
  { code: "4520", name: "Foreign Exchange Gains Revenue", accountType: "Revenue", subType: "Non-Operating Revenue", category: "Non-Operating Revenue", normalBalance: "Credit", description: "Foreign Exchange Gains Revenue Non-Operating RevenueNon-Operating Revenue." },
  { code: "4530", name: "Gain on Sale of Assets Revenue", accountType: "Revenue", subType: "Non-Operating Revenue", category: "Non-Operating Revenue", normalBalance: "Credit", description: "Gain on Sale of Assets Revenue Non-Operating RevenueNon-Operating Revenue." },
  { code: "4540", name: "Rental Income - Property Revenue", accountType: "Revenue", subType: "Non-Operating Revenue", category: "Non-Operating Revenue", normalBalance: "Credit", description: "Rental Income - Property Revenue Non-Operating RevenueNon-Operating Revenue." },
  { code: "4590", name: "Other Non-Operating Income", accountType: "Revenue", subType: "Non-Operating Revenue", category: "Non-Operating Revenue", normalBalance: "Credit", description: "Other Non-Operating Income Revenue Non-Operating RevenueNon-Operating Revenue." },

  // EXPENSES - Direct Cost of Sales - Vessel Operating Costs
  { code: "5000", name: "Fuel", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs ", normalBalance: "Debit", description: "Fuel Cost of Sales Direct Cost Vessel Operating Costs - Fuel." },
  { code: "5100", name: "Boat Insurance", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs ", normalBalance: "Debit", description: "Insurance Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5110", name: "Permits & License Fees for boat", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs ", normalBalance: "Debit", description: "Permits & License Fees Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5120", name: "Marina fee", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs ", normalBalance: "Debit", description: "Marina fee Cost of Sales Direct Cost Vessel Operating Costs - Crew." },

  // EXPENSES - Direct Cost of Sales - Crew Expenses
  { code: "5130", name: "Boat Team Salary", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Boat Team Salary Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5160", name: "Sales commission - Boat team", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Sales commission - Boat team Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5170", name: "Freelance Staff - boat team", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Freelance Staff - boat team." },
  { code: "5172", name: "Crew Bonuses", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Bonuses." },
  { code: "5173", name: "Crew Overtime", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Overtime." },
  { code: "5174", name: "Crew Gratuity Pass-Through", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Gratuity Pass-Through." },
  { code: "5190", name: "Crew Benefits - Health Insurance", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Benefits - Health Insurance Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5192", name: "Crew Travel & Repatriation", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Travel & Repatriation Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5193", name: "Crew Uniforms", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Uniforms Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5194", name: "Crew Training & Certification", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Training & Certification Cost of Sales Direct Cost Vessel Operating Costs - Crew." },
  { code: "5195", name: "Crew Expense", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Crew", normalBalance: "Debit", description: "Crew Expense Cost of Sales Direct Cost Vessel Operating Costs - Crew." },

  // EXPENSES - Direct Cost of Sales - Provisions
  { code: "5200", name: "Guest Provisions - Food and Baverage", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Provisions", normalBalance: "Debit", description: "Guest Provisions - Food and Baverage Cost of Sales Direct Cost Vessel Operating Costs - Provisions." },
  { code: "5250", name: "Laundry Service", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Provisions", normalBalance: "Debit", description: "Laundry Service Cost of Sales Direct Cost Vessel Operating Costs - Provisions." },
  { code: "5290", name: "Other Provisions", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Provisions", normalBalance: "Debit", description: "Other Provisions Cost of Sales Direct Cost Vessel Operating Costs - Provisions." },
  { code: "5295", name: "Guest Entertainment & Activities", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Provisions", normalBalance: "Debit", description: "Entertainment and activities for charter guests" },

  // EXPENSES - Direct Cost of Sales - Port & Marina
  { code: "5350", name: "Customs & Immigration Fees", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Port & Marina", normalBalance: "Debit", description: "Customs & Immigration Fees Cost of Sales Direct Cost Vessel Operating Costs - Port & Marina." },

  // EXPENSES - Direct Cost of Sales - Maintenance
  { code: "5500", name: "Boat Maintenance & Repairs - Regular ", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Maintenance", normalBalance: "Debit", description: "Boat Maintenance & Repairs Regular Cost of Sales Direct Cost Vessel Operating Costs - Maintenance." },
  { code: "5510", name: "Boat Maintenance & Repairs - Non-Regular", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Maintenance", normalBalance: "Debit", description: "Boat Maintenance & Repairs Non-Regular Cost of Sales Direct Cost Vessel Operating Costs - Maintenance." },
  { code: "5520", name: "Boat Maintenance & Repairs at Shipyard", accountType: "Expense", subType: "Direct Cost of Sales", category: "Vessel Operating Costs - Maintenance", normalBalance: "Debit", description: "Boat Maintenance & Repairs at Shipyard Cost of Sales Direct Cost Vessel Operating Costs - Maintenance." },

  // EXPENSES - Direct Cost of Sales - External Services
  { code: "5530", name: "Charter Cost – External Boat / Service", accountType: "Expense", subType: "Direct Cost of Sales", category: "External Boat / Service", normalBalance: "Debit", description: "Charter Cost – External Boat / Subcontracted Charter" },
  { code: "5600", name: "Salaries - Freelance", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Office Maintenance & Repairs Cost of Sales Direct Cost Vessel Operating Costs - Maintenance." },

  // EXPENSES - Operating Expense - Personnel Expenses
  { code: "6000", name: "Salaries - Management", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Salaries - Management Expense Operating Expense Personnel Expenses - Shore Staff." },
  { code: "6010", name: "Salaries - Administration", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Salaries - Administration Expense Operating Expense Personnel Expenses - Shore Staff." },
  { code: "6020", name: "Salaries - Sales & Marketing", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Salaries - Sales & Marketing Expense Operating Expense Personnel Expenses - Shore Staff." },
  { code: "6040", name: "Salaries - Finance & Accounting", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Salaries - Finance & Accounting Expense Operating Expense Personnel Expenses - Shore Staff." },
  { code: "6060", name: "Employee Benefits", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Employee Benefits - Health Insurance Expense Operating Expense Personnel Expenses - Shore Staff." },
  { code: "6065", name: "Employee Recruitment Costs", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Costs for recruiting and hiring employees" },
  { code: "6080", name: "TeamTraining & Development", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Staff Training & Development Expense Operating Expense Personnel Expenses - Shore Staff." },
  { code: "6090", name: "Team Travel & Entertainment", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Staff Travel & Entertainment Expense Operating Expense Personnel Expenses - Shore Staff." },

  // EXPENSES - Operating Expense - Office & Administrative
  { code: "6100", name: "Office Rent", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Office Rent Expense Operating Expense Office & Administrative Expenses." },
  { code: "6110", name: "Office Utilities", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Office Utilities Expense Operating Expense Office & Administrative Expenses." },
  { code: "6120", name: "Office Supplies", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Office Supplies Expense Operating Expense Office & Administrative Expenses." },
  { code: "6130", name: "Postage & Courier", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Postage & Courier Expense Operating Expense Office & Administrative Expenses." },
  { code: "6140", name: "Telephone & Internet", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Telephone & Internet Expense Operating Expense Office & Administrative Expenses." },
  { code: "6150", name: "Office Equipment Rental", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Office Equipment Rental Expense Operating Expense Office & Administrative Expenses." },
  { code: "6160", name: "Office Maintenance", accountType: "Expense", subType: "Operating Expense", category: "Office Maintenance", normalBalance: "Debit", description: "Office Maintenance Expense Operating Expense Office & Administrative Expenses." },
  { code: "6170", name: "Social Security Contributions", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Security Services Expense Operating Expense Office & Administrative Expenses." },
  { code: "6180", name: "Cleaning Services", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Cleaning Services Expense Operating Expense Office & Administrative Expenses." },
  { code: "6190", name: "Other Administrative Expenses", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Other Administrative Expenses Expense Operating Expense Office & Administrative Expenses." },

  // EXPENSES - Operating Expense - Professional Services
  { code: "6200", name: "Legal Fees Expense", accountType: "Expense", subType: "Operating Expense", category: "Professional Services", normalBalance: "Debit", description: "Legal Fees Expense Operating Expense Professional Services." },
  { code: "6210", name: "Accounting & Audit Fees", accountType: "Expense", subType: "Operating Expense", category: "Professional Services", normalBalance: "Debit", description: "Accounting & Audit Fees Expense Operating Expense Professional Services." },
  { code: "6220", name: "Tax Advisory Fees", accountType: "Expense", subType: "Operating Expense", category: "Professional Services", normalBalance: "Debit", description: "Tax Advisory Fees Expense Operating Expense Professional Services." },
  { code: "6230", name: "Consulting Fee", accountType: "Expense", subType: "Operating Expense", category: "Professional Services", normalBalance: "Debit", description: "Consulting Fees Expense Operating Expense Professional Services." },
  { code: "6240", name: "IT Services & Support", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "IT Services & Support Expense Operating Expense Professional Services." },
  { code: "6290", name: "Other Professional Fees", accountType: "Expense", subType: "Operating Expense", category: "Professional Services", normalBalance: "Debit", description: "Other Professional Fees Expense Operating Expense Professional Services." },

  // EXPENSES - Operating Expense - Marketing & Sales
  { code: "6300", name: "Advertising - Digital", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Advertising - Digital Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6310", name: "Advertising - Goodgle Ad", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Advertising - Print Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6320", name: "Website Development & Hosting", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Website Development & Hosting Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6330", name: "SEO & Digital Marketing", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "SEO & Digital Marketing Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6340", name: "Social Media Marketing", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Social Media Marketing Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6350", name: "Brochures & Print", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Brochures & Print Materials Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6360", name: "Boat Shows & Exhibitions", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Boat Shows & Exhibitions Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6370", name: "Photography & Videography", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Photography & Videography Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6380", name: "PR & Media Relations", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "PR & Media Relations Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6385", name: "Sponsorships", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Sponsorships Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6390", name: "Guests Entertainment", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Client Entertainment Expense Operating Expense Marketing & Sales Expenses." },
  { code: "6395", name: "Promotional Items", accountType: "Expense", subType: "Operating Expense", category: "Marketing & Sales Expenses", normalBalance: "Debit", description: "Promotional Items Expense Operating Expense Marketing & Sales Expenses." },

  // EXPENSES - Operating Expense - Technology & Software
  { code: "6400", name: "Software Subscriptions - Booking and Operating System", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Software Subscriptions - Booking System Expense Operating Expense Technology & Software." },
  { code: "6410", name: "Software Subscriptions - AI tools", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Software Subscriptions - CRM Expense Operating Expense Technology & Software." },
  { code: "6420", name: "Software Subscriptions - Accounting", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Software Subscriptions - Accounting Expense Operating Expense Technology & Software." },
  { code: "6430", name: "Software Subscriptions - General", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Software Subscriptions - Fleet Management Expense Operating Expense Technology & Software." },
  { code: "6440", name: "Cloud Services & Hosting", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Cloud Services & Hosting Expense Operating Expense Technology & Software." },
  { code: "6450", name: "Hardware Maintenance", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Hardware Maintenance Expense Operating Expense Technology & Software." },
  { code: "6460", name: "Cybersecurity", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Cybersecurity Expense Operating Expense Technology & Software." },
  { code: "6490", name: "Other Technology Cost", accountType: "Expense", subType: "Operating Expense", category: "Technology & Software", normalBalance: "Debit", description: "Other Technology Costs Expense Operating Expense Technology & Software." },

  // EXPENSES - Operating Expense - Insurance
  { code: "6500", name: "General Liability Insurance", accountType: "Expense", subType: "Operating Expense", category: "Insurance - Business", normalBalance: "Debit", description: "General Liability Insurance Expense Operating Expense Insurance - Business." },
  { code: "6505", name: "Directors & Officers Insurance", accountType: "Expense", subType: "Operating Expense", category: "Insurance - Business", normalBalance: "Debit", description: "Insurance coverage for directors and officers" },
  { code: "6530", name: "Property Insurance", accountType: "Expense", subType: "Operating Expense", category: "Insurance - Business", normalBalance: "Debit", description: "Property Insurance Expense Operating Expense Insurance - Business." },
  { code: "6550", name: "Cyber Liability Insurance", accountType: "Expense", subType: "Operating Expense", category: "Insurance - Business", normalBalance: "Debit", description: "Cyber Liability Insurance Expense Operating Expense Insurance - Business." },
  { code: "6590", name: "Other Business Insurance", accountType: "Expense", subType: "Operating Expense", category: "Insurance - Business", normalBalance: "Debit", description: "Other Business Insurance Expense Operating Expense Insurance - Business." },

  // EXPENSES - Operating Expense - Depreciation & Amortization
  { code: "6600", name: "Depreciation - Vessels", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Depreciation - Vessels Expense Operating Expense Depreciation & Amortization." },
  { code: "6610", name: "Depreciation - Vessel Equipment", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Depreciation - Vessel Equipment Expense Operating Expense Depreciation & Amortization." },
  { code: "6620", name: "Depreciation - Buildings", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Depreciation - Buildings Expense Operating Expense Depreciation & Amortization." },
  { code: "6630", name: "Depreciation - Office Equipment", accountType: "Expense", subType: "Operating Expense", category: "Office & Administrative Expenses", normalBalance: "Debit", description: "Depreciation - Office Equipment Expense Operating Expense Depreciation & Amortization." },
  { code: "6640", name: "Depreciation - Vehicles", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Depreciation - Vehicles Expense Operating Expense Depreciation & Amortization." },
  { code: "6650", name: "Depreciation - Right-of-Use Assets", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Depreciation - Right-of-Use Assets Expense Operating Expense Depreciation & Amortization." },
  { code: "6660", name: "Amortization - Intangible Assets", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Amortization - Intangible Assets Expense Operating Expense Depreciation & Amortization." },
  { code: "6670", name: "Amortization - Software Expense", accountType: "Expense", subType: "Operating Expense", category: "Depreciation & Amortization", normalBalance: "Debit", description: "Amortization - Software Expense Operating Expense Depreciation & Amortization." },

  // EXPENSES - Operating Expense - Other Operating Expenses
  { code: "6700", name: "Bank Charges & Fees Expense", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Bank Charges & Fees Expense Operating Expense Other Operating Expenses." },
  { code: "6710", name: "Credit Card Processing Fees", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Credit Card Processing Fees Expense Operating Expense Other Operating Expenses." },
  { code: "6720", name: "Foreign Exchange Transaction Costs", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Foreign Exchange Transaction Costs Expense Operating Expense Other Operating Expenses." },
  { code: "6740", name: "Licenses & Permits - Business", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Licenses & Permits - Business Expense Operating Expense Other Operating Expenses." },
  { code: "6760", name: "Charitable Donations", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Charitable Donations Expense Operating Expense Other Operating Expenses." },
  { code: "6770", name: "Miscellaneous Expenses", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Miscellaneous Expenses Expense Operating Expense Other Operating Expenses." },
  { code: "6790", name: "Other Operating Expenses", accountType: "Expense", subType: "Operating Expense", category: "Other Operating Expenses", normalBalance: "Debit", description: "Other Operating Expenses Expense Operating Expense Other Operating Expenses." },

  // EXPENSES - Finance Costs
  { code: "7000", name: "Interest Expense - Bank Loans", accountType: "Expense", subType: "Finance Costs", category: "Finance Costs", normalBalance: "Debit", description: "Interest Expense - Bank Loans Other Expense Finance Costs Finance Costs." },
  { code: "7010", name: "Interest Expense - Vessel Financing", accountType: "Expense", subType: "Finance Costs", category: "Finance Costs", normalBalance: "Debit", description: "Interest Expense - Vessel Financing Other Expense Finance Costs Finance Costs." },
  { code: "7020", name: "Interest Expense - Lease Liabilities", accountType: "Expense", subType: "Finance Costs", category: "Finance Costs", normalBalance: "Debit", description: "Interest Expense - Lease Liabilities Other Expense Finance Costs Finance Costs." },
  { code: "7030", name: "Interest Expense - Overdrafts", accountType: "Expense", subType: "Finance Costs", category: "Finance Costs", normalBalance: "Debit", description: "Interest Expense - Overdrafts Other Expense Finance Costs Finance Costs." },
  { code: "7090", name: "Other Finance Costs", accountType: "Expense", subType: "Finance Costs", category: "Finance Costs", normalBalance: "Debit", description: "Other Finance Costs Other Expense Finance Costs Finance Costs." },

  // EXPENSES - Non-Operating Expenses
  { code: "7100", name: "Foreign Exchange Losses", accountType: "Expense", subType: "Non-Operating Expense", category: "Non-Operating Expenses", normalBalance: "Debit", description: "Foreign Exchange Losses Other Expense Non-Operating ExpenseNon-Operating Expenses." },
  { code: "7110", name: "Loss on Sale of Assets", accountType: "Expense", subType: "Non-Operating Expense", category: "Non-Operating Expenses", normalBalance: "Debit", description: "Loss on Sale of Assets Other Expense Non-Operating ExpenseNon-Operating Expenses." },
  { code: "7160", name: "Environmental Remediation", accountType: "Expense", subType: "Non-Operating Expense", category: "Non-Operating Expenses", normalBalance: "Debit", description: "Environmental Remediation Other Expense Non-Operating ExpenseNon-Operating Expenses." },
  { code: "7190", name: "Other Non-Operating Expenses", accountType: "Expense", subType: "Non-Operating Expense", category: "Non-Operating Expenses", normalBalance: "Debit", description: "Other Non-Operating Expenses Other Expense Non-Operating ExpenseNon-Operating Expenses." },

  // EXPENSES - Income Tax
  { code: "8000", name: "Current Income Tax", accountType: "Expense", subType: "Income Tax", category: "Income Tax", normalBalance: "Debit", description: "Current Income Tax Expense Tax Income Tax Income Tax." },
  { code: "8010", name: "Deferred Income Tax", accountType: "Expense", subType: "Income Tax", category: "Income Tax", normalBalance: "Debit", description: "Deferred Income Tax Expense/(Benefit) Tax Income Tax Income Tax." },
  { code: "8020", name: "Prior Year Tax Adjustments Tax Income", accountType: "Expense", subType: "Income Tax", category: "Income Tax", normalBalance: "Debit", description: "Prior Year Tax Adjustments Tax Income Tax Income Tax." },
  { code: "8110", name: "Withholding Tax Expense", accountType: "Expense", subType: "Other Tax", category: "Other Taxes", normalBalance: "Debit", description: "Withholding Tax Expense Tax Other Tax Other Taxes." },
  { code: "8190", name: "Other Tax Expenses", accountType: "Expense", subType: "Other Tax", category: "Other Taxes", normalBalance: "Debit", description: "Other Tax Expenses Tax Other Tax Other Taxes." },
];

/**
 * Get accounts by type
 */
export function getAccountsByType(type: AccountType): ChartOfAccount[] {
  return chartOfAccounts.filter(account => account.accountType === type);
}

/**
 * Get accounts by category
 */
export function getAccountsByCategory(category: string): ChartOfAccount[] {
  return chartOfAccounts.filter(account => account.category === category);
}

/**
 * Find account by code
 */
export function findAccountByCode(code: string): ChartOfAccount | undefined {
  return chartOfAccounts.find(account => account.code === code);
}

/**
 * Get unique categories for a given account type
 */
export function getCategoriesForType(type: AccountType): string[] {
  const categories = new Set<string>();
  chartOfAccounts
    .filter(account => account.accountType === type)
    .forEach(account => categories.add(account.category));
  return Array.from(categories).sort();
}

/**
 * Get all active accounts
 */
export function getActiveAccounts(): ChartOfAccount[] {
  return chartOfAccounts.filter(account => account.isActive !== false);
}
