/**
 * Foreign Exchange Gain/Loss Calculator
 *
 * Calculates unrealized FX gain/loss on outstanding foreign currency
 * receivables (invoices) and payables (expenses).
 */

import { createClient } from '@/lib/supabase/client';
import type { Currency } from '@/data/company/types';

export interface FxGainLossEntry {
  documentType: 'invoice' | 'expense';
  documentId: string;
  documentNumber: string;
  counterpartyName: string;
  originalCurrency: Currency;
  originalAmount: number;
  outstandingAmount: number;
  bookRate: number;
  currentRate: number;
  bookValueTHB: number;
  currentValueTHB: number;
  unrealizedGainLoss: number;
}

export interface FxGainLossReport {
  asOfDate: string;
  currentRates: Record<string, number>;
  receivables: FxGainLossEntry[];
  payables: FxGainLossEntry[];
  totalReceivableGainLoss: number;
  totalPayableGainLoss: number;
  netGainLoss: number;
  generatedAt: string;
}

/**
 * Calculate unrealized FX gain/loss for all outstanding foreign currency documents
 */
export async function calculateFxGainLoss(
  asOfDate: string,
  currentRates: Record<string, number>, // e.g. { USD: 35.5, EUR: 38.2 }
  companyId?: string,
): Promise<FxGainLossReport> {
  const supabase = createClient();

  // AR: Outstanding invoices in foreign currency
  let invoiceQuery = supabase
    .from('invoices')
    .select('id, invoice_number, client_name, currency, total_amount, amount_outstanding, fx_rate')
    .eq('status', 'issued')
    .gt('amount_outstanding', 0)
    .neq('currency', 'THB');

  if (companyId) invoiceQuery = invoiceQuery.eq('company_id', companyId);

  const { data: invoices } = await invoiceQuery;

  const receivables: FxGainLossEntry[] = (invoices ?? []).map((inv: any) => {
    const bookRate = inv.fx_rate || 1;
    const currRate = currentRates[inv.currency] || bookRate;
    const outstanding = inv.amount_outstanding || 0;
    const bookValueTHB = outstanding * bookRate;
    const currentValueTHB = outstanding * currRate;

    return {
      documentType: 'invoice' as const,
      documentId: inv.id,
      documentNumber: inv.invoice_number || inv.id.slice(0, 8),
      counterpartyName: inv.client_name || 'Unknown',
      originalCurrency: inv.currency as Currency,
      originalAmount: inv.total_amount || 0,
      outstandingAmount: outstanding,
      bookRate,
      currentRate: currRate,
      bookValueTHB: Math.round(bookValueTHB * 100) / 100,
      currentValueTHB: Math.round(currentValueTHB * 100) / 100,
      // For receivables: gain if current value is higher (we receive more THB)
      unrealizedGainLoss: Math.round((currentValueTHB - bookValueTHB) * 100) / 100,
    };
  });

  // AP: Unpaid expenses in foreign currency
  let expenseQuery = supabase
    .from('expenses')
    .select('id, expense_number, vendor_name, currency, total_amount, fx_rate')
    .eq('status', 'approved')
    .neq('payment_status', 'paid')
    .neq('currency', 'THB');

  if (companyId) expenseQuery = expenseQuery.eq('company_id', companyId);

  const { data: expenses } = await expenseQuery;

  const payables: FxGainLossEntry[] = (expenses ?? []).map((exp: any) => {
    const bookRate = exp.fx_rate || 1;
    const currRate = currentRates[exp.currency] || bookRate;
    const outstanding = exp.total_amount || 0;
    const bookValueTHB = outstanding * bookRate;
    const currentValueTHB = outstanding * currRate;

    return {
      documentType: 'expense' as const,
      documentId: exp.id,
      documentNumber: exp.expense_number || exp.id.slice(0, 8),
      counterpartyName: exp.vendor_name || 'Unknown',
      originalCurrency: exp.currency as Currency,
      originalAmount: outstanding,
      outstandingAmount: outstanding,
      bookRate,
      currentRate: currRate,
      bookValueTHB: Math.round(bookValueTHB * 100) / 100,
      currentValueTHB: Math.round(currentValueTHB * 100) / 100,
      // For payables: loss if current value is higher (we pay more THB)
      unrealizedGainLoss: Math.round((bookValueTHB - currentValueTHB) * 100) / 100,
    };
  });

  const totalReceivableGainLoss = receivables.reduce((s, r) => s + r.unrealizedGainLoss, 0);
  const totalPayableGainLoss = payables.reduce((s, p) => s + p.unrealizedGainLoss, 0);

  return {
    asOfDate,
    currentRates,
    receivables,
    payables,
    totalReceivableGainLoss: Math.round(totalReceivableGainLoss * 100) / 100,
    totalPayableGainLoss: Math.round(totalPayableGainLoss * 100) / 100,
    netGainLoss: Math.round((totalReceivableGainLoss + totalPayableGainLoss) * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}
