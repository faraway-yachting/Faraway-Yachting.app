import { AccountBalance, AccountBalanceGroup, AccountType } from './types';

// Empty mock data - use Supabase
export const mockAccountBalances: AccountBalance[] = [];

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
