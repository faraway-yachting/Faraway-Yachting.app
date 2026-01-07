/**
 * Account Categories and Hierarchical Structure
 *
 * This file defines the categorization hierarchy for the Chart of Accounts,
 * used for organizing and grouping accounts in the UI.
 */

import { AccountType } from './chartOfAccounts';

export interface AccountCategory {
  type: AccountType;
  label: string;
  subTypes: AccountSubType[];
}

export interface AccountSubType {
  name: string;
  label: string;
  categories: CategoryDetail[];
}

export interface CategoryDetail {
  name: string;
  description?: string;
}

export const accountCategories: AccountCategory[] = [
  {
    type: 'Asset',
    label: 'Assets',
    subTypes: [
      {
        name: 'Current Asset',
        label: 'Current Assets',
        categories: [
          { name: 'Cash & Equivalents', description: 'Cash, bank accounts, and cash equivalents in multiple currencies' },
          { name: 'Receivables', description: 'Amounts owed to the company' },
          { name: 'Inventory', description: 'Parts, supplies, and other inventory items' },
          { name: 'Prepaid Expenses', description: 'Expenses paid in advance' },
          { name: 'Investments & Other', description: 'Short-term investments and other current assets' },
        ],
      },
      {
        name: 'Non-Current Asset',
        label: 'Non-Current Assets',
        categories: [
          { name: 'Property & Equipment', description: 'Long-term physical assets' },
          { name: 'Intangible Assets', description: 'Non-physical assets like licenses, trademarks, and goodwill' },
          { name: 'Investments & Other', description: 'Long-term investments, deposits, and deferred tax assets' },
        ],
      },
    ],
  },
  {
    type: 'Liability',
    label: 'Liabilities',
    subTypes: [
      {
        name: 'Current Liability',
        label: 'Current Liabilities',
        categories: [
          { name: 'Payables', description: 'Amounts owed to suppliers and vendors' },
          { name: 'Accrued Expenses', description: 'Expenses incurred but not yet paid' },
          { name: 'Taxes & Withholdings', description: 'Tax liabilities and employee withholdings' },
          { name: 'Deferred Revenue & Deposits', description: 'Advance payments and customer deposits' },
          { name: 'Short-Term Debt', description: 'Loans and financing due within one year' },
        ],
      },
      {
        name: 'Non-Current Liability',
        label: 'Non-Current Liabilities',
        categories: [
          { name: 'Long-Term Debt', description: 'Loans and financing due after one year' },
          { name: 'Other Non-Current Liabilities', description: 'Other long-term obligations and provisions' },
        ],
      },
    ],
  },
  {
    type: 'Equity',
    label: 'Equity',
    subTypes: [
      {
        name: 'Share Capital',
        label: 'Share Capital',
        categories: [
          { name: 'Share Capital', description: 'Ordinary and preference share capital' },
        ],
      },
      {
        name: 'Reserves',
        label: 'Reserves',
        categories: [
          { name: 'Reserves', description: 'Legal, capital, and revaluation reserves' },
        ],
      },
      {
        name: 'Retained Earnings',
        label: 'Retained Earnings',
        categories: [
          { name: 'Retained Earnings', description: 'Accumulated profits and current year earnings' },
        ],
      },
      {
        name: 'Other Equity',
        label: 'Other Equity',
        categories: [
          { name: 'Other Equity', description: 'Owner contributions and drawings' },
        ],
      },
    ],
  },
  {
    type: 'Revenue',
    label: 'Revenue',
    subTypes: [
      {
        name: 'Operating Revenue',
        label: 'Operating Revenue',
        categories: [
          { name: 'Charter Revenue', description: 'Revenue from charter services' },
          { name: 'Commission Revenue', description: 'Commission from bareboat and crewed charters' },
          { name: 'Ancillary Revenue', description: 'Food & beverage, merchandise sales' },
          { name: 'Management & Brokerage Revenue', description: 'Yacht management and sales commissions' },
          { name: 'Other Operating Revenue', description: 'Other revenue from operations' },
        ],
      },
      {
        name: 'Non-Operating Revenue',
        label: 'Non-Operating Revenue',
        categories: [
          { name: 'Non-Operating Revenue', description: 'Interest, dividends, and other non-operating income' },
        ],
      },
    ],
  },
  {
    type: 'Expense',
    label: 'Expenses',
    subTypes: [
      {
        name: 'Direct Cost of Sales',
        label: 'Direct Cost of Sales',
        categories: [
          { name: 'Vessel Operating Costs ', description: 'Fuel, insurance, permits, and marina fees' },
          { name: 'Vessel Operating Costs - Crew', description: 'Crew salaries, benefits, and related costs' },
          { name: 'Vessel Operating Costs - Provisions', description: 'Guest provisions, laundry, and entertainment' },
          { name: 'Vessel Operating Costs - Port & Marina', description: 'Port and marina fees' },
          { name: 'Vessel Operating Costs - Maintenance', description: 'Boat maintenance and repairs' },
          { name: 'External Boat / Service', description: 'Costs for external boats and subcontracted services' },
        ],
      },
      {
        name: 'Operating Expense',
        label: 'Operating Expenses',
        categories: [
          { name: 'Office & Administrative Expenses', description: 'Office operations and administrative costs' },
          { name: 'Office Maintenance', description: 'Office maintenance costs' },
          { name: 'Professional Services', description: 'Legal, accounting, consulting, and IT services' },
          { name: 'Marketing & Sales Expenses', description: 'Advertising, promotions, and sales activities' },
          { name: 'Technology & Software', description: 'Software subscriptions and technology costs' },
          { name: 'Insurance - Business', description: 'Business insurance policies' },
          { name: 'Depreciation & Amortization', description: 'Depreciation of assets and amortization' },
          { name: 'Other Operating Expenses', description: 'Bank fees, licenses, and miscellaneous expenses' },
        ],
      },
      {
        name: 'Finance Costs',
        label: 'Finance Costs',
        categories: [
          { name: 'Finance Costs', description: 'Interest and financing charges' },
        ],
      },
      {
        name: 'Non-Operating Expense',
        label: 'Non-Operating Expenses',
        categories: [
          { name: 'Non-Operating Expenses', description: 'FX losses, asset disposal losses, and other non-operating expenses' },
        ],
      },
      {
        name: 'Income Tax',
        label: 'Income Tax',
        categories: [
          { name: 'Income Tax', description: 'Current and deferred income tax' },
        ],
      },
      {
        name: 'Other Tax',
        label: 'Other Taxes',
        categories: [
          { name: 'Other Taxes', description: 'Withholding tax and other tax expenses' },
        ],
      },
    ],
  },
];

/**
 * Get category structure for a specific account type
 */
export function getCategoryStructure(type: AccountType): AccountCategory | undefined {
  return accountCategories.find(cat => cat.type === type);
}

/**
 * Get all unique categories across all account types
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  accountCategories.forEach(accountCat => {
    accountCat.subTypes.forEach(subType => {
      subType.categories.forEach(cat => {
        categories.add(cat.name);
      });
    });
  });
  return Array.from(categories).sort();
}
