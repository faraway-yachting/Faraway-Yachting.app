/**
 * Expense Mock Data
 *
 * Sample data for development and testing of the Expenses module.
 * Includes expense records, inventory purchases, asset purchases,
 * received credit/debit notes, and WHT certificates.
 */

import {
  ExpenseRecord,
  ExpenseLineItem,
  InventoryPurchase,
  InventoryPurchaseItem,
  AssetPurchase,
  AssetPurchaseItem,
  ReceivedCreditNote,
  ReceivedDebitNote,
  WhtCertificate,
  ExpensePayment,
} from './types';

// ============================================================================
// Expense Records (Empty - use Supabase)
// ============================================================================

export const mockExpenseRecords: ExpenseRecord[] = [];

// ============================================================================
// Inventory Purchases (Empty - use Supabase)
// ============================================================================

export const mockInventoryPurchases: InventoryPurchase[] = [];

// ============================================================================
// Asset Purchases (Empty - use Supabase)
// ============================================================================

export const mockAssetPurchases: AssetPurchase[] = [];

// ============================================================================
// Received Credit Notes (Empty - use Supabase)
// ============================================================================

export const mockReceivedCreditNotes: ReceivedCreditNote[] = [];

// ============================================================================
// Received Debit Notes (Empty - use Supabase)
// ============================================================================

export const mockReceivedDebitNotes: ReceivedDebitNote[] = [];

// ============================================================================
// WHT Certificates (Empty - use Supabase)
// ============================================================================

export const mockWhtCertificates: WhtCertificate[] = [];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all expense records
 */
export function getAllExpenseRecords(): ExpenseRecord[] {
  return mockExpenseRecords;
}

/**
 * Get expense records by company
 */
export function getExpenseRecordsByCompany(companyId: string): ExpenseRecord[] {
  return mockExpenseRecords.filter((e) => e.companyId === companyId);
}

/**
 * Get expense record by ID
 */
export function getExpenseRecordById(id: string): ExpenseRecord | undefined {
  return mockExpenseRecords.find((e) => e.id === id);
}

/**
 * Get all inventory purchases
 */
export function getAllInventoryPurchases(): InventoryPurchase[] {
  return mockInventoryPurchases;
}

/**
 * Get all asset purchases
 */
export function getAllAssetPurchases(): AssetPurchase[] {
  return mockAssetPurchases;
}

/**
 * Get all received credit notes
 */
export function getAllReceivedCreditNotes(): ReceivedCreditNote[] {
  return mockReceivedCreditNotes;
}

/**
 * Get all received debit notes
 */
export function getAllReceivedDebitNotes(): ReceivedDebitNote[] {
  return mockReceivedDebitNotes;
}

/**
 * Get all WHT certificates
 */
export function getAllWhtCertificates(): WhtCertificate[] {
  return mockWhtCertificates;
}

/**
 * Get WHT certificates by company
 */
export function getWhtCertificatesByCompany(companyId: string): WhtCertificate[] {
  return mockWhtCertificates.filter((c) => c.payerCompanyId === companyId);
}

/**
 * Get WHT certificates by period
 */
export function getWhtCertificatesByPeriod(period: string): WhtCertificate[] {
  return mockWhtCertificates.filter((c) => c.taxPeriod === period);
}
