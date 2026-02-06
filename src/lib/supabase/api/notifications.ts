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
  /** Optional: send an email notification via Resend (Edge Function) */
  sendEmail?: {
    to: string;
    subject: string;
    html: string;
  };
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
    // Gracefully handle missing table or RLS errors - return empty array
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        // Table doesn't exist yet - silently return empty
        return [];
      }
      console.warn('Notifications fetch error:', error.message);
      return [];
    }
    return (data ?? []).map(dbToFrontend);
  },

  async getUnreadCount(role: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`target_role.eq.${role},target_role.eq.all`)
      .eq('read', false);
    // Gracefully handle missing table
    if (error) return 0;
    return count ?? 0;
  },

  async create(input: NotificationCreateInput): Promise<AppNotification | null> {
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
    if (error) {
      console.warn('Failed to create notification:', error.message);
      return null;
    }

    // Send email via Edge Function if requested (fire-and-forget)
    if (input.sendEmail) {
      supabase.functions.invoke('send-email', {
        body: {
          to: input.sendEmail.to,
          subject: input.sendEmail.subject,
          html: input.sendEmail.html,
        },
      }).catch((emailErr) => {
        console.warn('Failed to send email notification:', emailErr);
      });
    }

    return dbToFrontend(data);
  },

  async markAsRead(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) console.warn('Failed to mark notification as read:', error.message);
  },

  async markAllAsRead(role: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .or(`target_role.eq.${role},target_role.eq.all`)
      .eq('read', false);
    if (error) console.warn('Failed to mark all notifications as read:', error.message);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) console.warn('Failed to delete notification:', error.message);
  },
};
