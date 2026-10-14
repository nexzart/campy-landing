CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('bookings', 'subscribers')),
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  received_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  country TEXT,
  CHECK ((type = 'bookings' AND status IN ('new','contacted','scheduled','completed','cancelled')) OR
         (type = 'subscribers' AND status IN ('active','unsubscribed')))
);
CREATE UNIQUE INDEX subscribers_email ON leads(email) WHERE type = 'subscribers';
CREATE INDEX leads_received ON leads(type, received_at DESC, id);
CREATE INDEX leads_status_received ON leads(type, status, received_at DESC);
CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
