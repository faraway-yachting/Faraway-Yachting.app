/**
 * Inventory Purchase Event Handler
 *
 * Generates journal entries for inventory purchases (INVENTORY_PURCHASE_RECORDED)
 * and inventory consumption (INVENTORY_CONSUMED).
 *
 * Purchase entry:
 *   Debit: 1200 Inventory (total of all line items)
 *   Debit: 1170 VAT Receivable (if applicable)
 *   Credit: Bank GL / Cash on Hand (1020) / Petty Cash (1000/1001/1002)
 *
 * Consumption entry:
 *   Debit: 5xxx Expense account (per consumed item)
 *   Credit: 1200 Inventory
 */

import type {
  AccountingEventRow,
  EventHandler,
  InventoryPurchaseRecordedEventData,
  InventoryConsumedEventData,
  JournalSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

// ============================================================================
// INVENTORY_PURCHASE_RECORDED Handler
// ============================================================================

function validatePurchase(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as InventoryPurchaseRecordedEventData;

  if (!data.purchaseId) {
    return { valid: false, error: 'Missing purchase ID' };
  }

  if (!data.purchaseNumber) {
    return { valid: false, error: 'Missing purchase number' };
  }

  if (!data.purchaseDate) {
    return { valid: false, error: 'Missing purchase date' };
  }

  if (data.totalNetPayable === undefined || data.totalNetPayable <= 0) {
    return { valid: false, error: 'Invalid net payable amount' };
  }

  if (!data.paymentType) {
    return { valid: false, error: 'Missing payment type' };
  }

  if (data.paymentType === 'bank' && !data.bankAccountGlCode) {
    return { valid: false, error: 'Missing bank account GL code for bank payment' };
  }

  if (data.paymentType === 'petty_cash' && !data.pettyCashGlCode) {
    return { valid: false, error: 'Missing petty cash GL code for petty cash payment' };
  }

  return { valid: true };
}

/**
 * Determine the credit account based on payment type
 */
function getCreditAccount(data: InventoryPurchaseRecordedEventData): string {
  switch (data.paymentType) {
    case 'bank':
      return data.bankAccountGlCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;
    case 'cash':
      return DEFAULT_ACCOUNTS.CASH_ON_HAND;
    case 'petty_cash':
      return data.pettyCashGlCode || DEFAULT_ACCOUNTS.CASH;
    default:
      return DEFAULT_ACCOUNTS.DEFAULT_BANK;
  }
}

async function generatePurchaseJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as InventoryPurchaseRecordedEventData;
  const companyId = event.affected_companies[0];
  const creditAccount = getCreditAccount(data);

  const lines = [];

  // Debit: 1200 Inventory (subtotal = sum of line item pre-VAT amounts)
  lines.push({
    accountCode: DEFAULT_ACCOUNTS.INVENTORY,
    entryType: 'debit' as const,
    amount: data.totalSubtotal,
    description: `Inventory purchase${data.vendorName ? ` from ${data.vendorName}` : ''} - ${data.purchaseNumber}`,
  });

  // Debit: 1170 VAT Receivable (if applicable)
  if (data.totalVatAmount > 0) {
    lines.push({
      accountCode: DEFAULT_ACCOUNTS.VAT_RECEIVABLE,
      entryType: 'debit' as const,
      amount: data.totalVatAmount,
      description: `VAT on inventory purchase - ${data.purchaseNumber}`,
    });
  }

  // Credit: Bank/Cash/Petty Cash
  const creditDescription = data.paymentType === 'petty_cash'
    ? `Petty cash${data.pettyCashWalletName ? ` (${data.pettyCashWalletName})` : ''} - ${data.purchaseNumber}`
    : `Payment for inventory - ${data.purchaseNumber}`;

  lines.push({
    accountCode: creditAccount,
    entryType: 'credit' as const,
    amount: data.totalNetPayable,
    description: creditDescription,
  });

  return [
    {
      companyId,
      entryDate: data.purchaseDate,
      description: `Inventory Purchase - ${data.purchaseNumber}${data.vendorName ? ` (${data.vendorName})` : ''}`,
      lines,
    },
  ];
}

export const inventoryPurchaseRecordedHandler: EventHandler = {
  eventType: 'INVENTORY_PURCHASE_RECORDED',
  validate: validatePurchase,
  generateJournals: generatePurchaseJournals,
};

// ============================================================================
// INVENTORY_CONSUMED Handler
// ============================================================================

function validateConsumption(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as InventoryConsumedEventData;

  if (!data.purchaseId) {
    return { valid: false, error: 'Missing purchase ID' };
  }

  if (!data.consumptions || data.consumptions.length === 0) {
    return { valid: false, error: 'No consumption items' };
  }

  for (const item of data.consumptions) {
    if (!item.expenseAccountCode) {
      return { valid: false, error: `Missing expense account code for item: ${item.description}` };
    }
    if (item.amount <= 0) {
      return { valid: false, error: `Invalid amount for item: ${item.description}` };
    }
  }

  if (data.totalAmount <= 0) {
    return { valid: false, error: 'Invalid total amount' };
  }

  return { valid: true };
}

async function generateConsumptionJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as InventoryConsumedEventData;
  const companyId = event.affected_companies[0];

  const lines = [];

  // Debit: 5xxx Expense accounts (one per consumption record)
  for (const item of data.consumptions) {
    lines.push({
      accountCode: item.expenseAccountCode,
      entryType: 'debit' as const,
      amount: item.amount,
      description: `${item.description}${item.projectName ? ` - ${item.projectName}` : ''}`,
    });
  }

  // Credit: 1200 Inventory (total)
  lines.push({
    accountCode: DEFAULT_ACCOUNTS.INVENTORY,
    entryType: 'credit' as const,
    amount: data.totalAmount,
    description: `Inventory consumed - ${data.purchaseNumber}`,
  });

  return [
    {
      companyId,
      entryDate: data.consumedDate,
      description: `Inventory Consumed - ${data.purchaseNumber}`,
      lines,
    },
  ];
}

export const inventoryConsumedHandler: EventHandler = {
  eventType: 'INVENTORY_CONSUMED',
  validate: validateConsumption,
  generateJournals: generateConsumptionJournals,
};
