/**
 * Test Data Factories for Event-Driven Journal System
 *
 * These factory functions generate valid event data for testing.
 */

import type {
  ExpenseApprovedEventData,
  ExpensePaidEventData,
  ReceiptReceivedEventData,
  ManagementFeeEventData,
  IntercompanySettlementEventData,
  OpeningBalanceEventData,
  PartnerProfitAllocationEventData,
  PartnerPaymentEventData,
  CapexIncurredEventData,
  ProjectServiceCompletedEventData,
} from '../eventTypes';

// Test prefix to identify test data for cleanup
export const TEST_PREFIX = 'TEST_EVT_';

/**
 * Create expense approved event data
 */
export function createExpenseApprovedEventData(
  overrides?: Partial<ExpenseApprovedEventData>
): ExpenseApprovedEventData {
  return {
    expenseId: `${TEST_PREFIX}exp-001`,
    expenseNumber: 'TEST-EXP-001',
    vendorName: 'Test Vendor Co.',
    expenseDate: '2024-01-15',
    lineItems: [
      { description: 'Office Supplies', accountCode: '6100', amount: 1000 },
      { description: 'IT Services', accountCode: '6200', amount: 2000 },
    ],
    totalSubtotal: 3000,
    totalVatAmount: 210,
    totalAmount: 3210,
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create expense paid event data
 */
export function createExpensePaidEventData(
  overrides?: Partial<ExpensePaidEventData>
): ExpensePaidEventData {
  return {
    expenseId: `${TEST_PREFIX}exp-001`,
    paymentId: `${TEST_PREFIX}pay-001`,
    expenseNumber: 'TEST-EXP-001',
    vendorName: 'Test Vendor Co.',
    paymentDate: '2024-01-20',
    paymentAmount: 3210,
    bankAccountId: `${TEST_PREFIX}bank-001`,
    bankAccountGlCode: '1011',
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create receipt received event data
 */
export function createReceiptReceivedEventData(
  overrides?: Partial<ReceiptReceivedEventData>
): ReceiptReceivedEventData {
  return {
    receiptId: `${TEST_PREFIX}rec-001`,
    receiptNumber: 'TEST-REC-001',
    clientName: 'Test Client Ltd.',
    receiptDate: '2024-01-15',
    lineItems: [
      { description: 'Charter Service', accountCode: '4100', amount: 50000 },
    ],
    payments: [
      {
        amount: 53500,
        bankAccountId: `${TEST_PREFIX}bank-001`,
        bankAccountGlCode: '1011',
        paymentMethod: 'bank_transfer',
      },
    ],
    totalSubtotal: 50000,
    totalVatAmount: 3500,
    totalAmount: 53500,
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create management fee event data (multi-company)
 */
export function createManagementFeeEventData(
  projectCompanyId: string,
  managementCompanyId: string,
  overrides?: Partial<ManagementFeeEventData>
): ManagementFeeEventData {
  return {
    periodFrom: '2024-01-01',
    periodTo: '2024-01-31',
    projectId: `${TEST_PREFIX}proj-001`,
    projectName: 'Test Project',
    projectCompanyId,
    managementCompanyId,
    feePercentage: 10,
    grossIncome: 100000,
    feeAmount: 10000,
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create intercompany settlement event data (multi-company)
 */
export function createIntercompanySettlementEventData(
  fromCompanyId: string,
  toCompanyId: string,
  fromBankGlCode: string,
  toBankGlCode: string,
  overrides?: Partial<IntercompanySettlementEventData>
): IntercompanySettlementEventData {
  return {
    fromCompanyId,
    toCompanyId,
    settlementDate: '2024-02-01',
    settlementAmount: 10000,
    fromBankAccountId: `${TEST_PREFIX}bank-from`,
    toBankAccountId: `${TEST_PREFIX}bank-to`,
    fromBankGlCode,
    toBankGlCode,
    reference: 'IC-TEST-001',
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create opening balance event data
 */
export function createOpeningBalanceEventData(
  overrides?: Partial<OpeningBalanceEventData>
): OpeningBalanceEventData {
  return {
    fiscalYear: '2024',
    balances: [
      { accountCode: '1000', accountName: 'Cash', debitAmount: 50000, creditAmount: 0 },
      { accountCode: '1010', accountName: 'Bank THB', debitAmount: 200000, creditAmount: 0 },
      { accountCode: '2050', accountName: 'Accounts Payable', debitAmount: 0, creditAmount: 100000 },
      { accountCode: '3200', accountName: 'Retained Earnings', debitAmount: 0, creditAmount: 150000 },
    ],
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create partner profit allocation event data
 */
export function createPartnerProfitAllocationEventData(
  overrides?: Partial<PartnerProfitAllocationEventData>
): PartnerProfitAllocationEventData {
  return {
    periodFrom: '2024-01-01',
    periodTo: '2024-03-31',
    projectId: `${TEST_PREFIX}proj-001`,
    projectName: 'Test Project',
    allocations: [
      {
        participantId: `${TEST_PREFIX}part-001`,
        participantName: 'Owner A',
        ownershipPercentage: 60,
        allocatedAmount: 60000,
      },
      {
        participantId: `${TEST_PREFIX}part-002`,
        participantName: 'Owner B',
        ownershipPercentage: 40,
        allocatedAmount: 40000,
      },
    ],
    totalProfit: 100000,
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create partner payment event data
 */
export function createPartnerPaymentEventData(
  bankAccountGlCode: string,
  overrides?: Partial<PartnerPaymentEventData>
): PartnerPaymentEventData {
  return {
    projectId: `${TEST_PREFIX}proj-001`,
    participantId: `${TEST_PREFIX}part-001`,
    participantName: 'Owner A',
    paymentDate: '2024-04-01',
    paymentAmount: 60000,
    bankAccountId: `${TEST_PREFIX}bank-001`,
    bankAccountGlCode,
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create capex incurred event data
 */
export function createCapexIncurredEventData(
  bankAccountGlCode: string,
  overrides?: Partial<CapexIncurredEventData>
): CapexIncurredEventData {
  return {
    assetDescription: 'Navigation Equipment',
    assetAccountCode: '1500',
    acquisitionDate: '2024-01-15',
    acquisitionCost: 150000,
    vendorName: 'Marine Electronics Ltd.',
    paymentMethod: 'bank',
    bankAccountId: `${TEST_PREFIX}bank-001`,
    bankAccountGlCode,
    currency: 'THB',
    ...overrides,
  };
}

/**
 * Create project service completed event data
 */
export function createProjectServiceCompletedEventData(
  overrides?: Partial<ProjectServiceCompletedEventData>
): ProjectServiceCompletedEventData {
  return {
    projectId: `${TEST_PREFIX}proj-001`,
    projectName: 'Test Project',
    completionDate: '2024-01-31',
    revenueAccountCode: '4100',
    deferredRevenueAccountCode: '2300',
    amount: 50000,
    description: 'Charter service completion',
    currency: 'THB',
    ...overrides,
  };
}
