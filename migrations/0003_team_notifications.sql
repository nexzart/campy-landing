ALTER TABLE leads ADD COLUMN notification_status TEXT NOT NULL DEFAULT 'not_requested'
  CHECK (notification_status IN ('not_requested', 'pending', 'sending', 'sent', 'failed'));
ALTER TABLE leads ADD COLUMN notification_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN notification_error TEXT;
ALTER TABLE leads ADD COLUMN notification_sent_at TEXT;
ALTER TABLE leads ADD COLUMN notification_next_attempt_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN notification_lock_until INTEGER NOT NULL DEFAULT 0;
CREATE INDEX leads_notification_pending ON leads(notification_status, notification_next_attempt_at);
