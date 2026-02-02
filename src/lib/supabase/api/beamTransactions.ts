import { createClient } from '../client';
import type { Database } from '../database.types';

type DbBeamTransaction = Database['public']['Tables']['beam_transactions']['Row'];
type DbBeamTransactionInsert = Database['public']['Tables']['beam_transactions']['Insert'];

export type { DbBeamTransaction, DbBeamTransactionInsert };

interface SettlementSummaryRow {
  settlementDate: string;
  totalGross: number;
  totalFee: number;
  totalVat: number;
  totalNet: number;
  count: number;
  invoiceNo: string | null;
}

export const beamTransactionsApi = {
  async getAll(filters?: {
    merchantAccountId?: string;
    matchStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<DbBeamTransaction[]> {
    const supabase = createClient();
    let query = supabase
      .from('beam_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (filters?.merchantAccountId) {
      query = query.eq('merchant_account_id', filters.merchantAccountId);
    }
    if (filters?.matchStatus) {
      query = query.eq('match_status', filters.matchStatus);
    }
    if (filters?.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('transaction_date', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<DbBeamTransaction | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByBookingId(bookingId: string): Promise<DbBeamTransaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .select('*')
      .eq('booking_id', bookingId)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getBySettlementDate(date: string, merchantAccountId: string): Promise<DbBeamTransaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .select('*')
      .eq('settlement_date', date)
      .eq('merchant_account_id', merchantAccountId)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getExistingChargeIds(chargeIds: string[]): Promise<string[]> {
    if (chargeIds.length === 0) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .select('charge_id')
      .in('charge_id', chargeIds);
    if (error) throw error;
    return (data ?? []).map((row) => row.charge_id);
  },

  async importFromCsv(
    rows: DbBeamTransactionInsert[],
    existingChargeIds: string[]
  ): Promise<DbBeamTransaction[]> {
    const existingSet = new Set(existingChargeIds);
    const filteredRows = rows.filter((row) => !existingSet.has(row.charge_id));
    if (filteredRows.length === 0) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .insert(filteredRows)
      .select();
    if (error) throw error;
    return data ?? [];
  },

  async matchToBooking(id: string, bookingId: string, confidence?: number): Promise<DbBeamTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .update({
        match_status: 'matched',
        booking_id: bookingId,
        match_confidence: confidence ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async unmatch(id: string): Promise<DbBeamTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .update({
        match_status: 'unmatched',
        booking_id: null,
        receipt_id: null,
        match_confidence: null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markReconciled(id: string, receiptId: string): Promise<DbBeamTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_transactions')
      .update({
        match_status: 'reconciled',
        receipt_id: receiptId,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getSettlementSummary(
    merchantAccountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SettlementSummaryRow[]> {
    const transactions = await this.getAll({
      merchantAccountId,
      dateFrom,
      dateTo,
    });

    const grouped = new Map<
      string,
      { totalGross: number; totalFee: number; totalVat: number; totalNet: number; count: number; invoiceNo: string | null }
    >();

    for (const txn of transactions) {
      const key = txn.settlement_date ?? 'unsettled';
      const existing = grouped.get(key);
      if (existing) {
        existing.totalGross += txn.gross_amount;
        existing.totalFee += txn.fee_amount;
        existing.totalVat += txn.vat_amount;
        existing.totalNet += txn.net_amount;
        existing.count += 1;
        if (!existing.invoiceNo && txn.invoice_no) {
          existing.invoiceNo = txn.invoice_no;
        }
      } else {
        grouped.set(key, {
          totalGross: txn.gross_amount,
          totalFee: txn.fee_amount,
          totalVat: txn.vat_amount,
          totalNet: txn.net_amount,
          count: 1,
          invoiceNo: txn.invoice_no,
        });
      }
    }

    const result: SettlementSummaryRow[] = [];
    for (const [settlementDate, summary] of grouped) {
      result.push({
        settlementDate,
        totalGross: Math.round(summary.totalGross * 100) / 100,
        totalFee: Math.round(summary.totalFee * 100) / 100,
        totalVat: Math.round(summary.totalVat * 100) / 100,
        totalNet: Math.round(summary.totalNet * 100) / 100,
        count: summary.count,
        invoiceNo: summary.invoiceNo,
      });
    }

    result.sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));
    return result;
  },
};
