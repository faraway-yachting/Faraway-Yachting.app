/**
 * AR/AP Aging Calculation Engine
 *
 * Generates aging reports for Accounts Receivable (from invoices)
 * and Accounts Payable (from expenses).
 * Buckets: Current, 1-30, 31-60, 61-90, 90+
 */

import { createClient } from '@/lib/supabase/client';
import type { Currency } from '@/data/company/types';

export interface AgingItem {
  documentId: string;
  documentNumber: string;
  documentType: 'invoice' | 'expense';
  counterpartyName: string;
  documentDate: string;
  dueDate: string;
  originalAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  currency: Currency;
  companyId: string;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number;
  amount: number;
  count: number;
  items: AgingItem[];
}

export interface AgingReport {
  type: 'receivable' | 'payable';
  asOfDate: string;
  companyId?: string;
  generatedAt: string;
  buckets: AgingBucket[];
  totalOutstanding: number;
  totalCount: number;
}

const BUCKET_DEFS = [
  { label: 'Current', minDays: -999999, maxDays: 0 },
  { label: '1-30 days', minDays: 1, maxDays: 30 },
  { label: '31-60 days', minDays: 31, maxDays: 60 },
  { label: '61-90 days', minDays: 61, maxDays: 90 },
  { label: '90+ days', minDays: 91, maxDays: 999999 },
];

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyIntoBuckets(items: AgingItem[]): AgingBucket[] {
  const buckets: AgingBucket[] = BUCKET_DEFS.map(def => ({
    ...def,
    amount: 0,
    count: 0,
    items: [],
  }));

  for (const item of items) {
    const bucket = buckets.find(
      b => item.daysOverdue >= b.minDays && item.daysOverdue <= b.maxDays
    );
    if (bucket) {
      bucket.amount += item.outstandingAmount;
      bucket.count++;
      bucket.items.push(item);
    }
  }

  return buckets;
}

/**
 * Generate AR Aging from outstanding invoices
 */
export async function generateARaging(asOfDate: string, companyId?: string): Promise<AgingReport> {
  const supabase = createClient();

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, client_name, invoice_date, due_date, total_amount, amount_outstanding, currency, company_id')
    .eq('status', 'issued')
    .gt('amount_outstanding', 0)
    .lte('invoice_date', asOfDate);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) throw error;

  const items: AgingItem[] = (data ?? []).map(inv => {
    const dueDate = inv.due_date || inv.invoice_date;
    return {
      documentId: inv.id,
      documentNumber: inv.invoice_number || inv.id.slice(0, 8),
      documentType: 'invoice' as const,
      counterpartyName: inv.client_name || 'Unknown',
      documentDate: inv.invoice_date,
      dueDate,
      originalAmount: inv.total_amount || 0,
      outstandingAmount: inv.amount_outstanding || 0,
      daysOverdue: daysBetween(asOfDate, dueDate),
      currency: (inv.currency || 'THB') as Currency,
      companyId: inv.company_id,
    };
  });

  const buckets = classifyIntoBuckets(items);

  return {
    type: 'receivable',
    asOfDate,
    companyId,
    generatedAt: new Date().toISOString(),
    buckets,
    totalOutstanding: items.reduce((s, i) => s + i.outstandingAmount, 0),
    totalCount: items.length,
  };
}

/**
 * Generate AP Aging from unpaid expenses
 */
export async function generateAPaging(asOfDate: string, companyId?: string): Promise<AgingReport> {
  const supabase = createClient();

  let query = supabase
    .from('expenses')
    .select('id, expense_number, vendor_name, expense_date, due_date, total_amount, payment_status, currency, company_id')
    .eq('status', 'approved')
    .neq('payment_status', 'paid')
    .lte('expense_date', asOfDate);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) throw error;

  const items: AgingItem[] = (data ?? []).map((exp: any) => {
    const dueDate = exp.due_date || exp.expense_date;
    return {
      documentId: exp.id,
      documentNumber: exp.expense_number || exp.id.slice(0, 8),
      documentType: 'expense' as const,
      counterpartyName: exp.vendor_name || 'Unknown',
      documentDate: exp.expense_date,
      dueDate,
      originalAmount: exp.total_amount || 0,
      outstandingAmount: exp.total_amount || 0,
      daysOverdue: daysBetween(asOfDate, dueDate),
      currency: (exp.currency || 'THB') as Currency,
      companyId: exp.company_id,
    };
  });

  const buckets = classifyIntoBuckets(items);

  return {
    type: 'payable',
    asOfDate,
    companyId,
    generatedAt: new Date().toISOString(),
    buckets,
    totalOutstanding: items.reduce((s, i) => s + i.outstandingAmount, 0),
    totalCount: items.length,
  };
}
