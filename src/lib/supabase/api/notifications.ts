import { createClient } from '../client';
import type { Database } from '../database.types';

type DbNotification = Database['public']['Tables']['notifications']['Row'];
type DbNotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  referenceId: string;
  referenceNumber?: string;
  targetRole: string;
  targetUserId?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationCreateInput {
  type: string;
  title: string;
  message: string;
  link?: string;
  referenceId: string;
  referenceNumber?: string;
  targetRole: string;
  targetUserId?: string;
}

function dbToFrontend(db: DbNotification): AppNotification {
  return {
    id: db.id,
    type: db.type,
    title: db.title,
    message: db.message,
    link: db.link ?? undefined,
    referenceId: db.reference_id,
    referenceNumber: db.reference_number ?? undefined,
    targetRole: db.target_role,
    targetUserId: db.target_user_id ?? undefined,
    read: db.read,
    createdAt: db.created_at,
  };
}

export const notificationsApi = {
  async getForRole(role: string): Promise<AppNotification[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_role.eq.${role},target_role.eq.all`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getUnreadCount(role: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`target_role.eq.${role},target_role.eq.all`)
      .eq('read', false);
    if (error) throw error;
    return count ?? 0;
  },

  async create(input: NotificationCreateInput): Promise<AppNotification> {
    const supabase = createClient();
    const row: DbNotificationInsert = {
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      reference_id: input.referenceId,
      reference_number: input.referenceNumber ?? null,
      target_role: input.targetRole,
      target_user_id: input.targetUserId ?? null,
    };
    const { data, error } = await supabase
      .from('notifications')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async markAsRead(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(role: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .or(`target_role.eq.${role},target_role.eq.all`)
      .eq('read', false);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
