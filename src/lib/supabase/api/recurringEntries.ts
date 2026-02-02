import { createClient } from '../client';
import { journalEntriesApi } from './journalEntries';
import { generateJournalReferenceNumber } from '@/lib/accounting/journalPostingService';

interface TemplateLine {
  account_code: string;
  entry_type: 'debit' | 'credit';
  amount: number;
  description?: string;
}

interface RecurringJournalTemplate {
  id: string;
  company_id: string;
  description: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  next_run_date: string;
  end_date: string | null;
  is_active: boolean;
  auto_post: boolean;
  template_lines: TemplateLine[];
  last_run_date: string | null;
  run_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type { RecurringJournalTemplate, TemplateLine };

function advanceDate(date: string, frequency: 'monthly' | 'quarterly' | 'yearly'): string {
  const d = new Date(date);
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export const recurringEntriesApi = {
  async getAll(companyId?: string): Promise<RecurringJournalTemplate[]> {
    const supabase = createClient();
    let query = (supabase as any)
      .from('recurring_journal_templates')
      .select('*')
      .order('next_run_date', { ascending: true });
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as RecurringJournalTemplate[];
  },

  async getActive(companyId?: string): Promise<RecurringJournalTemplate[]> {
    const supabase = createClient();
    let query = (supabase as any)
      .from('recurring_journal_templates')
      .select('*')
      .eq('is_active', true)
      .order('next_run_date', { ascending: true });
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as RecurringJournalTemplate[];
  },

  async getDueEntries(asOfDate: string): Promise<RecurringJournalTemplate[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('recurring_journal_templates')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_date', asOfDate)
      .order('next_run_date', { ascending: true });
    if (error) throw error;
    // Filter out entries past their end_date
    return ((data ?? []) as RecurringJournalTemplate[]).filter(t =>
      !t.end_date || t.next_run_date <= t.end_date
    );
  },

  async create(template: {
    company_id: string;
    description: string;
    frequency: 'monthly' | 'quarterly' | 'yearly';
    next_run_date: string;
    end_date?: string;
    auto_post?: boolean;
    template_lines: TemplateLine[];
    created_by?: string;
  }): Promise<RecurringJournalTemplate> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('recurring_journal_templates')
      .insert([template])
      .select()
      .single();
    if (error) throw error;
    return data as RecurringJournalTemplate;
  },

  async update(id: string, updates: Partial<RecurringJournalTemplate>): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('recurring_journal_templates')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('recurring_journal_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Execute a single recurring template: create a journal entry and advance the next_run_date.
   */
  async executeEntry(template: RecurringJournalTemplate): Promise<string> {
    const referenceNumber = await generateJournalReferenceNumber(template.company_id);

    const totalDebit = template.template_lines
      .filter(l => l.entry_type === 'debit')
      .reduce((s, l) => s + l.amount, 0);

    const entry = await journalEntriesApi.create(
      {
        reference_number: referenceNumber,
        entry_date: template.next_run_date,
        company_id: template.company_id,
        description: `[Recurring] ${template.description}`,
        status: template.auto_post ? 'posted' : 'draft',
        total_debit: totalDebit,
        total_credit: totalDebit,
        is_auto_generated: true,
        source_document_type: 'recurring',
        source_document_id: template.id,
        created_by: template.created_by || undefined,
      },
      template.template_lines.map(line => ({
        account_code: line.account_code,
        entry_type: line.entry_type,
        amount: line.amount,
        description: line.description || template.description,
      }))
    );

    // Advance next_run_date
    const nextDate = advanceDate(template.next_run_date, template.frequency);
    const isStillActive = !template.end_date || nextDate <= template.end_date;

    await this.update(template.id, {
      next_run_date: nextDate,
      last_run_date: template.next_run_date,
      run_count: template.run_count + 1,
      is_active: isStillActive,
    } as any);

    return entry.id;
  },

  /**
   * Execute all due recurring entries.
   */
  async executeDueEntries(): Promise<{ executed: number; errors: number }> {
    const today = new Date().toISOString().split('T')[0];
    const dueEntries = await this.getDueEntries(today);
    let executed = 0;
    let errors = 0;

    for (const template of dueEntries) {
      try {
        await this.executeEntry(template);
        executed++;
      } catch (err) {
        console.error(`[recurringEntries] Failed to execute template ${template.id}:`, err);
        errors++;
      }
    }

    return { executed, errors };
  },
};
