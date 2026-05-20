-- Track whether an approval email has been sent for each registration
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS approval_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_email_sent_at timestamptz;

-- Index for quick lookup of approved-but-not-yet-emailed rows (for future cron/retry)
CREATE INDEX IF NOT EXISTS idx_registrations_email_pending
  ON public.registrations (status, approval_email_sent)
  WHERE status = 'approved' AND approval_email_sent = false;
