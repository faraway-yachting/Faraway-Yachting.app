import type { ExpenseCategory } from './types';

// Petty Cash Expense Categories
export const expenseCategories: ExpenseCategory[] = [
  {
    id: 'cat-001',
    name: 'Transportation',
    code: 'TRANS',
    glAccountCode: '5101',
    isActive: true,
  },
  {
    id: 'cat-002',
    name: 'Office Supplies',
    code: 'OFFICE',
    glAccountCode: '5102',
    isActive: true,
  },
  {
    id: 'cat-003',
    name: 'Meals & Entertainment',
    code: 'MEALS',
    glAccountCode: '5103',
    isActive: true,
  },
  {
    id: 'cat-004',
    name: 'Maintenance & Repairs',
    code: 'MAINT',
    glAccountCode: '5104',
    isActive: true,
  },
  {
    id: 'cat-005',
    name: 'Fuel & Gas',
    code: 'FUEL',
    glAccountCode: '5105',
    isActive: true,
  },
  {
    id: 'cat-006',
    name: 'Communication',
    code: 'COMM',
    glAccountCode: '5106',
    isActive: true,
  },
  {
    id: 'cat-007',
    name: 'Cleaning Supplies',
    code: 'CLEAN',
    glAccountCode: '5107',
    isActive: true,
  },
  {
    id: 'cat-008',
    name: 'Postage & Courier',
    code: 'POST',
    glAccountCode: '5108',
    isActive: true,
  },
  {
    id: 'cat-009',
    name: 'Safety Equipment',
    code: 'SAFETY',
    glAccountCode: '5109',
    isActive: true,
  },
  {
    id: 'cat-010',
    name: 'Miscellaneous',
    code: 'MISC',
    glAccountCode: '5199',
    isActive: true,
  },
];

// Get all active categories
export function getActiveCategories(): ExpenseCategory[] {
  return expenseCategories.filter((cat) => cat.isActive);
}

// Get category by ID
export function getCategoryById(id: string): ExpenseCategory | undefined {
  return expenseCategories.find((cat) => cat.id === id);
}

// Get category by code
export function getCategoryByCode(code: string): ExpenseCategory | undefined {
  return expenseCategories.find((cat) => cat.code === code);
}
