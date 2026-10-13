CREATE TABLE IF NOT EXISTS inquiries (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 vrchat_id TEXT NOT NULL,
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done'))
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
