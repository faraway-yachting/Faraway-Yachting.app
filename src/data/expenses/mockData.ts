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
// Expense Records
// ============================================================================

export const mockExpenseRecords: ExpenseRecord[] = [
  {
    id: 'exp-001',
    expenseNumber: 'EXP-2512-0001',
    supplierInvoiceNumber: 'INV-ABC-2024-1234',
    supplierInvoiceDate: '2025-12-20',
    companyId: 'company-001',
    vendorId: 'contact-001',
    vendorName: 'ABC Marina Services',
    expenseDate: '2025-12-22',
    dueDate: '2026-01-22',
    pricingType: 'exclude_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'exp-001-line-001',
        description: 'Monthly mooring fee - December 2025',
        quantity: 1,
        unitPrice: 25000,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 25000,
        preVatAmount: 25000,
        whtAmount: 0,
        projectId: 'project-001', // Ocean Star
        accountCode: '5120', // Marina fees
      },
      {
        id: 'exp-001-line-002',
        description: 'Hull cleaning service',
        quantity: 1,
        unitPrice: 15000,
        taxRate: 7,
        whtRate: 3,
        whtBaseCalculation: 'pre_vat',
        amount: 15000,
        preVatAmount: 15000,
        whtAmount: 450,
        projectId: 'project-001', // Ocean Star
        accountCode: '5200', // Maintenance
      },
    ],
    subtotal: 40000,
    vatAmount: 2800,
    totalAmount: 42800,
    whtAmount: 450,
    netPayable: 42350,
    paymentStatus: 'unpaid',
    amountPaid: 0,
    amountOutstanding: 42350,
    receiptStatus: 'received',
    receiptReceivedDate: '2025-12-22',
    receiptReceivedBy: 'accountant@faraway.com',
    status: 'approved',
    approvedDate: '2025-12-22',
    approvedBy: 'manager@faraway.com',
    whtCertificateIds: ['wht-001'],
    notes: 'Regular monthly marina services',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-22T09:00:00Z',
    updatedAt: '2025-12-22T10:30:00Z',
  },
  {
    id: 'exp-002',
    expenseNumber: 'EXP-2512-0002',
    supplierInvoiceNumber: 'BF-2025-5678',
    supplierInvoiceDate: '2025-12-23',
    companyId: 'company-001',
    vendorId: 'contact-002',
    vendorName: 'Blue Ocean Fuel Co.',
    expenseDate: '2025-12-23',
    dueDate: '2025-12-23', // Due on receipt
    pricingType: 'include_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'exp-002-line-001',
        description: 'Diesel fuel - 500 liters',
        quantity: 500,
        unitPrice: 35,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 17500,
        preVatAmount: 16355.14,
        whtAmount: 0,
        projectId: 'project-002', // Wave Rider
        accountCode: '5000', // Fuel
      },
    ],
    subtotal: 16355.14,
    vatAmount: 1144.86,
    totalAmount: 17500,
    whtAmount: 0,
    netPayable: 17500,
    paymentStatus: 'paid',
    amountPaid: 17500,
    amountOutstanding: 0,
    payments: [
      {
        id: 'pay-001',
        paymentDate: '2025-12-23',
        amount: 17500,
        paidFrom: 'bank-001', // KBank THB
        reference: 'Transfer #1234567',
      },
    ],
    receiptStatus: 'received',
    receiptReceivedDate: '2025-12-23',
    receiptReceivedBy: 'accountant@faraway.com',
    status: 'approved',
    approvedDate: '2025-12-23',
    approvedBy: 'manager@faraway.com',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-23T11:00:00Z',
    updatedAt: '2025-12-23T14:00:00Z',
  },
  {
    id: 'exp-003',
    expenseNumber: 'EXP-2512-0003',
    supplierInvoiceNumber: 'SYS-2025-0789',
    supplierInvoiceDate: '2025-12-24',
    companyId: 'company-001',
    vendorId: 'contact-004',
    vendorName: 'Siam Yacht Supplies',
    expenseDate: '2025-12-26',
    dueDate: '2026-01-26',
    pricingType: 'exclude_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'exp-003-line-001',
        description: 'Engine maintenance service',
        quantity: 1,
        unitPrice: 45000,
        taxRate: 7,
        whtRate: 3,
        whtBaseCalculation: 'pre_vat',
        amount: 45000,
        preVatAmount: 45000,
        whtAmount: 1350,
        projectId: 'project-001', // Ocean Star
        accountCode: '5200', // Maintenance
      },
      {
        id: 'exp-003-line-002',
        description: 'Oil filter replacement',
        quantity: 2,
        unitPrice: 2500,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 5000,
        preVatAmount: 5000,
        whtAmount: 0,
        projectId: 'project-001',
        accountCode: '5210', // Spare parts
      },
    ],
    subtotal: 50000,
    vatAmount: 3500,
    totalAmount: 53500,
    whtAmount: 1350,
    netPayable: 52150,
    paymentStatus: 'unpaid',
    amountPaid: 0,
    amountOutstanding: 52150,
    receiptStatus: 'pending',
    status: 'draft',
    notes: 'Quarterly engine maintenance',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-26T08:00:00Z',
    updatedAt: '2025-12-26T08:00:00Z',
  },
  {
    id: 'exp-004',
    expenseNumber: 'EXP-2512-0004',
    supplierInvoiceNumber: 'ABC-2025-9012',
    supplierInvoiceDate: '2025-12-18',
    companyId: 'company-002',
    vendorId: 'contact-001',
    vendorName: 'ABC Marina Services',
    expenseDate: '2025-12-20',
    dueDate: '2026-01-20',
    pricingType: 'exclude_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'exp-004-line-001',
        description: 'Monthly mooring fee - Sea Breeze',
        quantity: 1,
        unitPrice: 30000,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 30000,
        preVatAmount: 30000,
        whtAmount: 0,
        projectId: 'project-003', // Sea Breeze
        accountCode: '5120',
      },
    ],
    subtotal: 30000,
    vatAmount: 2100,
    totalAmount: 32100,
    whtAmount: 0,
    netPayable: 32100,
    paymentStatus: 'partially_paid',
    amountPaid: 15000,
    amountOutstanding: 17100,
    payments: [
      {
        id: 'pay-002',
        paymentDate: '2025-12-25',
        amount: 15000,
        paidFrom: 'bank-002', // SCB THB
        reference: 'Partial payment',
      },
    ],
    receiptStatus: 'received',
    receiptReceivedDate: '2025-12-20',
    status: 'approved',
    approvedDate: '2025-12-20',
    approvedBy: 'manager@bluehorizon.com',
    createdBy: 'accountant@bluehorizon.com',
    createdAt: '2025-12-20T10:00:00Z',
    updatedAt: '2025-12-25T15:00:00Z',
  },
];

// ============================================================================
// Inventory Purchases
// ============================================================================

export const mockInventoryPurchases: InventoryPurchase[] = [
  {
    id: 'inv-pur-001',
    purchaseNumber: 'PO-INV-2512-0001',
    supplierInvoiceNumber: 'SYS-2025-INV-001',
    supplierInvoiceDate: '2025-12-15',
    companyId: 'company-001',
    vendorId: 'contact-004',
    vendorName: 'Siam Yacht Supplies',
    purchaseDate: '2025-12-15',
    expectedDeliveryDate: '2025-12-20',
    actualDeliveryDate: '2025-12-19',
    pricingType: 'exclude_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'inv-pur-001-line-001',
        description: 'Life jackets - Adult size',
        sku: 'LJ-ADULT-001',
        quantity: 10,
        unitPrice: 2500,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 25000,
        preVatAmount: 25000,
        whtAmount: 0,
        projectId: 'project-001',
        accountCode: '1400', // Inventory
      },
      {
        id: 'inv-pur-001-line-002',
        description: 'First aid kits - Marine grade',
        sku: 'FAK-MARINE-001',
        quantity: 5,
        unitPrice: 3500,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 17500,
        preVatAmount: 17500,
        whtAmount: 0,
        projectId: 'project-001',
        accountCode: '1400',
      },
    ],
    subtotal: 42500,
    vatAmount: 2975,
    totalAmount: 45475,
    whtAmount: 0,
    netPayable: 45475,
    paymentStatus: 'paid',
    amountPaid: 45475,
    amountOutstanding: 0,
    payments: [
      {
        id: 'pay-inv-001',
        paymentDate: '2025-12-20',
        amount: 45475,
        paidFrom: 'bank-001',
        reference: 'TRF-INV-001',
      },
    ],
    receiptStatus: 'received',
    receiptReceivedDate: '2025-12-19',
    status: 'received',
    receivedDate: '2025-12-19',
    receivedBy: 'warehouse@faraway.com',
    notes: 'Safety equipment restock',
    createdBy: 'procurement@faraway.com',
    createdAt: '2025-12-15T09:00:00Z',
    updatedAt: '2025-12-20T11:00:00Z',
  },
];

// ============================================================================
// Asset Purchases
// ============================================================================

export const mockAssetPurchases: AssetPurchase[] = [
  {
    id: 'ast-pur-001',
    purchaseNumber: 'PO-AST-2512-0001',
    supplierInvoiceNumber: 'MARINE-EQUIP-2025-001',
    supplierInvoiceDate: '2025-12-10',
    companyId: 'company-001',
    vendorId: 'contact-004',
    vendorName: 'Siam Yacht Supplies',
    purchaseDate: '2025-12-10',
    acquisitionDate: '2025-12-12',
    pricingType: 'exclude_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'ast-pur-001-line-001',
        assetName: 'Garmin Marine GPS Navigator',
        assetCode: 'GPS-001',
        description: 'Garmin GPSMAP 8612 - 12" Chartplotter',
        quantity: 1,
        unitPrice: 185000,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 185000,
        preVatAmount: 185000,
        whtAmount: 0,
        projectId: 'project-001',
        assetAccountCode: '1600', // Fixed Assets - Equipment
        depreciationAccountCode: '6100', // Depreciation
        usefulLifeYears: 5,
      },
    ],
    subtotal: 185000,
    vatAmount: 12950,
    totalAmount: 197950,
    whtAmount: 0,
    netPayable: 197950,
    paymentStatus: 'paid',
    amountPaid: 197950,
    amountOutstanding: 0,
    payments: [
      {
        id: 'pay-ast-001',
        paymentDate: '2025-12-12',
        amount: 197950,
        paidFrom: 'bank-001',
        reference: 'TRF-AST-001',
      },
    ],
    receiptStatus: 'received',
    status: 'acquired',
    notes: 'Navigation system upgrade for Ocean Star',
    createdBy: 'captain@faraway.com',
    createdAt: '2025-12-10T14:00:00Z',
    updatedAt: '2025-12-12T16:00:00Z',
  },
];

// ============================================================================
// Received Credit Notes
// ============================================================================

export const mockReceivedCreditNotes: ReceivedCreditNote[] = [
  {
    id: 'rcn-001',
    creditNoteNumber: 'RCN-2512-0001',
    supplierCreditNoteNumber: 'ABC-CN-2025-001',
    companyId: 'company-001',
    vendorId: 'contact-001',
    vendorName: 'ABC Marina Services',
    creditNoteDate: '2025-12-28',
    reference: 'EXP-2512-0001',
    originalExpenseId: 'exp-001',
    pricingType: 'exclude_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'rcn-001-line-001',
        description: 'Discount on hull cleaning service',
        quantity: 1,
        unitPrice: 2000,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 2000,
        preVatAmount: 2000,
        whtAmount: 0,
        projectId: 'project-001',
        accountCode: '5200',
      },
    ],
    subtotal: 2000,
    vatAmount: 140,
    whtAmount: 0,
    totalAmount: 2140,
    reason: 'discount',
    status: 'applied',
    appliedDate: '2025-12-28',
    appliedBy: 'accountant@faraway.com',
    notes: 'Loyalty discount applied',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-28T10:00:00Z',
    updatedAt: '2025-12-28T10:30:00Z',
  },
];

// ============================================================================
// Received Debit Notes
// ============================================================================

export const mockReceivedDebitNotes: ReceivedDebitNote[] = [
  {
    id: 'rdn-001',
    debitNoteNumber: 'RDN-2512-0001',
    supplierDebitNoteNumber: 'BF-DN-2025-001',
    companyId: 'company-001',
    vendorId: 'contact-002',
    vendorName: 'Blue Ocean Fuel Co.',
    debitNoteDate: '2025-12-29',
    pricingType: 'include_vat',
    currency: 'THB',
    lineItems: [
      {
        id: 'rdn-001-line-001',
        description: 'Fuel surcharge adjustment',
        quantity: 1,
        unitPrice: 535,
        taxRate: 7,
        whtRate: 0,
        whtBaseCalculation: 'pre_vat',
        amount: 535,
        preVatAmount: 500,
        whtAmount: 0,
        projectId: 'project-002',
        accountCode: '5000',
      },
    ],
    subtotal: 500,
    vatAmount: 35,
    whtAmount: 0,
    totalAmount: 535,
    reason: 'price_increase',
    status: 'accepted',
    acceptedDate: '2025-12-29',
    acceptedBy: 'accountant@faraway.com',
    notes: 'December fuel price adjustment',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-29T09:00:00Z',
    updatedAt: '2025-12-29T09:15:00Z',
  },
];

// ============================================================================
// WHT Certificates
// ============================================================================

export const mockWhtCertificates: WhtCertificate[] = [
  {
    id: 'wht-001',
    certificateNumber: 'WHT-FYL-2025-0001',
    formType: 'pnd53', // Company
    payerCompanyId: 'company-001',
    payerName: 'Faraway Yachting Co., Ltd.',
    payerAddress: '123 Marina Road, Phuket, Thailand 83100',
    payerTaxId: '0105565000001',
    payeeVendorId: 'contact-001',
    payeeName: 'ABC Marina Services Co., Ltd.',
    payeeAddress: '123 Marina Road, Phuket, Thailand 83100',
    payeeTaxId: '0105561234567',
    payeeIsCompany: true,
    paymentDate: '2025-12-22',
    incomeType: '40(8)', // Other services
    amountPaid: 15000, // Pre-WHT amount for hull cleaning
    whtRate: 3,
    whtAmount: 450,
    taxPeriod: '2025-12',
    expenseRecordIds: ['exp-001'],
    status: 'issued',
    issuedDate: '2025-12-22',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-22T10:30:00Z',
    updatedAt: '2025-12-22T10:30:00Z',
  },
  {
    id: 'wht-002',
    certificateNumber: 'WHT-FYL-2025-0002',
    formType: 'pnd53',
    payerCompanyId: 'company-001',
    payerName: 'Faraway Yachting Co., Ltd.',
    payerAddress: '123 Marina Road, Phuket, Thailand 83100',
    payerTaxId: '0105565000001',
    payeeVendorId: 'contact-004',
    payeeName: 'Siam Yacht Supplies Co., Ltd.',
    payeeAddress: '789 Industrial Estate, Bangkok, Thailand 10110',
    payeeTaxId: '0105563456789',
    payeeIsCompany: true,
    paymentDate: '2025-12-26',
    incomeType: '40(8)',
    amountPaid: 45000,
    whtRate: 3,
    whtAmount: 1350,
    taxPeriod: '2025-12',
    expenseRecordIds: ['exp-003'],
    status: 'draft',
    createdBy: 'accountant@faraway.com',
    createdAt: '2025-12-26T08:30:00Z',
    updatedAt: '2025-12-26T08:30:00Z',
  },
];

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
