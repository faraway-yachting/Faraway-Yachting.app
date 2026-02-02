import { createClient } from '../client';

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export const auditLogApi = {
  async getByRecord(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('audit_log')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('changed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AuditLogEntry[];
  },

  async getRecent(limit: number = 50): Promise<AuditLogEntry[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLogEntry[];
  },

  async getByTable(tableName: string, limit: number = 100): Promise<AuditLogEntry[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('audit_log')
      .select('*')
      .eq('table_name', tableName)
      .order('changed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLogEntry[];
  },
};
