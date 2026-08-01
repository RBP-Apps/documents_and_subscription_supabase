-- ====================================================================
-- SQL Schema Update for Renewal Notification History & Cron Schedule
-- ====================================================================

-- 1. Create the renewal_notification_history table
CREATE TABLE IF NOT EXISTS public.renewal_notification_history (
    id BIGSERIAL PRIMARY KEY,
    renewal_id TEXT NOT NULL,
    document_name TEXT NULL,
    concern_person TEXT NULL,
    mobile_number TEXT NOT NULL,
    renewal_date DATE NOT NULL,
    reminder_days INTEGER DEFAULT 15,
    message_status TEXT NOT NULL CHECK (message_status IN ('Success', 'Failed', 'Pending')),
    whatsapp_message_id TEXT NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create index for fast duplicate prevention checks
CREATE INDEX IF NOT EXISTS idx_renewal_notification_dup 
ON public.renewal_notification_history (renewal_id, renewal_date, reminder_days, message_status);

-- 3. Enable RLS (Row Level Security) and allow public / service role access
ALTER TABLE public.renewal_notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.renewal_notification_history
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.renewal_notification_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.renewal_notification_history
    FOR UPDATE USING (true);


-- ====================================================================
-- 4. Supabase Cron (pg_cron + pg_net) Daily Scheduled Execution
-- ====================================================================
-- Run the following in Supabase SQL Editor after deploying the Edge Function:
--
-- SELECT cron.schedule(
--     'daily-renewal-reminder-15-days',
--     '0 9 * * *', -- Every day at 09:00 AM UTC
--     $$
--     SELECT
--       net.http_post(
--           url:='https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/renewal-reminder',
--           headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY>"}'::jsonb,
--           body:='{}'::jsonb
--       ) as request_id;
--     $$
-- );
