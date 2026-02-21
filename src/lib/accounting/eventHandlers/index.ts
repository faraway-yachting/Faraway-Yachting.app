/**
 * Event Handlers Index
 *
 * Export all accounting event handlers from a single location.
 */

export { expenseApprovedHandler } from './expenseApprovedHandler';
export { expensePaidHandler } from './expensePaidHandler';
export { expensePaidIntercompanyHandler } from './expensePaidIntercompanyHandler';
export { receiptReceivedHandler } from './receiptReceivedHandler';
export { receiptReceivedIntercompanyHandler } from './receiptReceivedIntercompanyHandler';

// Petty cash handlers
export { pettyCashExpenseHandler } from './pettyCashExpenseHandler';
export { pettyCashTopupHandler } from './pettyCashTopupHandler';
export { pettyCashReimbursementHandler } from './pettyCashReimbursementHandler';

// Multi-company handlers
export { managementFeeHandler } from './managementFeeHandler';
export { intercompanySettlementHandler } from './intercompanySettlementHandler';

// Other handlers
export { partnerProfitAllocationHandler } from './partnerProfitAllocationHandler';
export { partnerPaymentHandler } from './partnerPaymentHandler';
export { openingBalanceHandler } from './openingBalanceHandler';
export { capexIncurredHandler } from './capexIncurredHandler';
export { projectServiceCompletedHandler } from './projectServiceCompletedHandler';

// Inventory handlers
export { inventoryPurchaseRecordedHandler, inventoryConsumedHandler } from './inventoryPurchaseHandler';
