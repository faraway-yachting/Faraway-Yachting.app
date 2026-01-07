import { AccountBalance, AccountBalanceGroup, AccountType } from './types';

export const mockAccountBalances: AccountBalance[] = [
  // Cash Accounts
  {
    id: 'acc-001',
    accountId: 'petty-cash-thb-001',
    accountName: 'Petty Cash THB',
    accountType: 'cash',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'THB',
    openingBalance: 50000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 42500,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 200000,
      totalOut: 207500,
    },
    glAccountCode: '1000',
    isActive: true,
  },
  {
    id: 'acc-002',
    accountId: 'petty-cash-usd-001',
    accountName: 'Petty Cash USD',
    accountType: 'cash',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'USD',
    openingBalance: 2000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 1850,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 5000,
      totalOut: 5150,
    },
    glAccountCode: '1002',
    isActive: true,
  },
  {
    id: 'acc-003',
    accountId: 'petty-cash-thb-002',
    accountName: 'Petty Cash THB',
    accountType: 'cash',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    currency: 'THB',
    openingBalance: 30000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 28500,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 150000,
      totalOut: 151500,
    },
    glAccountCode: '1000',
    isActive: true,
  },

  // Bank Accounts
  {
    id: 'acc-004',
    accountId: 'bank-001',
    accountName: 'Bangkok Bank - Operating (THB)',
    accountType: 'bank',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'THB',
    openingBalance: 5000000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 8750000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 45000000,
      totalOut: 41250000,
    },
    glAccountCode: '1010',
    isActive: true,
  },
  {
    id: 'acc-005',
    accountId: 'bank-002',
    accountName: 'Kasikorn Bank - USD Account',
    accountType: 'bank',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'USD',
    openingBalance: 50000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 125000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 350000,
      totalOut: 275000,
    },
    glAccountCode: '1012',
    isActive: true,
  },
  {
    id: 'acc-006',
    accountId: 'bank-003',
    accountName: 'SCB - Charter Deposits (THB)',
    accountType: 'bank',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'THB',
    openingBalance: 2000000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 3500000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 12000000,
      totalOut: 10500000,
    },
    glAccountCode: '1010',
    isActive: true,
  },
  {
    id: 'acc-007',
    accountId: 'bank-004',
    accountName: 'Bangkok Bank - Main (THB)',
    accountType: 'bank',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    currency: 'THB',
    openingBalance: 3000000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 4200000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 25000000,
      totalOut: 23800000,
    },
    glAccountCode: '1010',
    isActive: true,
  },
  {
    id: 'acc-008',
    accountId: 'bank-005',
    accountName: 'DBS Singapore (SGD)',
    accountType: 'bank',
    companyId: 'company-002',
    companyName: 'Blue Horizon Maritime',
    currency: 'SGD',
    openingBalance: 80000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 95000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 200000,
      totalOut: 185000,
    },
    glAccountCode: '1013',
    isActive: true,
  },

  // E-Wallets
  {
    id: 'acc-009',
    accountId: 'ewallet-001',
    accountName: 'PromptPay Business',
    accountType: 'e-wallet',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'THB',
    openingBalance: 100000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 185000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 500000,
      totalOut: 415000,
    },
    glAccountCode: '1014',
    isActive: true,
  },
  {
    id: 'acc-010',
    accountId: 'ewallet-002',
    accountName: 'K PLUS Business',
    accountType: 'e-wallet',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'THB',
    openingBalance: 50000,
    openingBalanceDate: '2025-01-01',
    currentBalance: 75000,
    asOfDate: '2025-12-31',
    movements: {
      totalIn: 250000,
      totalOut: 225000,
    },
    glAccountCode: '1014',
    isActive: true,
  },
];

// Helper function to get accounts grouped by type
export function getAccountBalancesByGroup(accounts: AccountBalance[]): AccountBalanceGroup[] {
  const groups: Map<AccountType, AccountBalance[]> = new Map();

  accounts.forEach(account => {
    if (!groups.has(account.accountType)) {
      groups.set(account.accountType, []);
    }
    groups.get(account.accountType)!.push(account);
  });

  const typeLabels: Record<AccountType, string> = {
    cash: 'Cash Accounts',
    bank: 'Bank Accounts',
    'e-wallet': 'e-Wallets',
  };

  const result: AccountBalanceGroup[] = [];
  const order: AccountType[] = ['cash', 'bank', 'e-wallet'];

  order.forEach(type => {
    const typeAccounts = groups.get(type) || [];
    if (typeAccounts.length > 0) {
      result.push({
        type,
        label: typeLabels[type],
        accounts: typeAccounts,
        totalBalance: typeAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0),
      });
    }
  });

  return result;
}

// Helper function to filter by company
export function filterAccountsByCompany(accounts: AccountBalance[], companyId: string): AccountBalance[] {
  if (!companyId || companyId === 'all-companies') {
    return accounts;
  }

  const actualCompanyId = companyId.replace('company-', '');
  return accounts.filter(acc => acc.companyId === companyId || acc.companyId === actualCompanyId);
}

// Get all accounts
export function getAllAccountBalances(): AccountBalance[] {
  return mockAccountBalances;
}
