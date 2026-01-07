// Core APIs
export { companiesApi } from './companies';
export { contactsApi } from './contacts';
export { projectsApi } from './projects';
export { bankAccountsApi } from './bankAccounts';

// Income APIs
export { invoicesApi, type InvoiceWithLineItems } from './invoices';
export { quotationsApi, type QuotationWithLineItems } from './quotations';
export { receiptsApi, type ReceiptWithDetails } from './receipts';

// Expense APIs
export { expensesApi, type ExpenseWithDetails } from './expenses';

// Petty Cash APIs
export { pettyCashApi, type WalletWithDetails } from './pettyCash';

// Settings APIs
export { settingsApi } from './settings';

// Accounting APIs
export { journalEntriesApi, chartOfAccountsApi, type JournalEntryWithLines } from './journalEntries';

// Auth APIs
export { authApi, type SignUpData, type SignInData } from './auth';
