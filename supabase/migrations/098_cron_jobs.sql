-- ============================================================
-- pg_cron scheduled jobs (Supabase Pro)
-- pg_cron and pg_net are already enabled on Supabase Pro
-- ============================================================

-- ============================================================
-- Daily alert processing at 8:00 AM UTC (3:00 PM Bangkok time)
-- Calls the process-alerts Edge Function which checks:
--   1. Expiring employee documents
--   2. Overdue invoices
-- ============================================================
SELECT cron.schedule(
  'daily-alerts',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/process-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- Weekly cleanup: delete read notifications older than 30 days
-- Runs every Sunday at midnight UTC
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 0 * * 0',
  $$DELETE FROM public.notifications WHERE read = true AND created_at < now() - interval '30 days';$$
);
