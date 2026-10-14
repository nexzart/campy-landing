ALTER TABLE leads ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_requested'
  CHECK (email_status IN ('not_requested', 'pending', 'sending', 'sent', 'failed', 'skipped'));
ALTER TABLE leads ADD COLUMN email_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN email_error TEXT;
ALTER TABLE leads ADD COLUMN email_sent_at TEXT;
ALTER TABLE leads ADD COLUMN email_next_attempt_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN email_lock_until INTEGER NOT NULL DEFAULT 0;
CREATE INDEX leads_email_pending ON leads(email_status, email_next_attempt_at);
