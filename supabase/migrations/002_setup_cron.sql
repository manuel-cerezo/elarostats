-- Migration: daily player-stats sync via pg_cron + pg_net
-- -------------------------------------------------------
-- Schedules the `sync-players` Edge Function to run every day
-- at 08:00 Europe/Madrid (handles CET/CEST automatically).
--
-- Prerequisites (run once from the Supabase dashboard):
--   Extensions → enable `pg_cron` and `pg_net`
--
-- After running this migration, store the credentials in Vault:
--
--   SELECT vault.create_secret(
--     '<https://xxxx.supabase.co>',
--     'supabase_project_url'
--   );
--
--   SELECT vault.create_secret(
--     '<service-role-key>',
--     'supabase_service_role_key'
--   );
--
-- (Replace the placeholders with your actual values — never commit secrets.)

-- ── 1. Enable required extensions ─────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. Schedule the cron job ───────────────────────────────────────────────
-- pg_cron 1.5+ supports schedule_in_timezone so the time is always
-- exactly 08:00 Madrid time regardless of CET/CEST.

SELECT cron.schedule_in_timezone(
  'sync-players-daily',          -- job name (must be unique)
  '0 8 * * *',                   -- every day at 08:00
  'Europe/Madrid',               -- always correct — handles DST automatically
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM   vault.decrypted_secrets
      WHERE  name = 'supabase_project_url'
    ) || '/functions/v1/sync-players',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM   vault.decrypted_secrets
        WHERE  name = 'supabase_service_role_key'
      )
    ),
    body := jsonb_build_object('timestamp', now())
  ) AS request_id;
  $$
);

-- ── 3. Helper: check scheduled jobs ───────────────────────────────────────
-- Run this query to confirm the job is registered:
--   SELECT jobid, jobname, schedule, timezone, active
--   FROM   cron.job
--   WHERE  jobname = 'sync-players-daily';

-- ── 4. Helper: check recent runs ──────────────────────────────────────────
-- Run this query to inspect execution history:
--   SELECT start_time, end_time, status, return_message
--   FROM   cron.job_run_details
--   WHERE  jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-players-daily')
--   ORDER  BY start_time DESC
--   LIMIT  10;
