-- Migration: Configure pg_cron daily sync job
-- Llama a la Edge Function sync-players cada día a las 07:00 UTC
-- (= 08:00 hora Madrid CET / 09:00 CEST en verano)
--
-- Requiere que pg_cron y pg_net estén activos (ver 000_extensions.sql o
-- ejecutar manualmente: CREATE EXTENSION IF NOT EXISTS pg_cron; pg_net;)

SELECT cron.schedule(
  'sync-players-daily',                  -- nombre único del job
  '0 7 * * *',                           -- 07:00 UTC diario
  $$
  SELECT net.http_post(
    url     := 'https://fwhwhycgvjqprephxkbe.supabase.co/functions/v1/sync-players',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aHdoeWNndmpxcHJlcGh4a2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDQzMzQsImV4cCI6MjA4NzE4MDMzNH0.3_0ZHXuvVokjyC-BdLTmdmsczwEcXC9P_nsoWzlrrKw"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
