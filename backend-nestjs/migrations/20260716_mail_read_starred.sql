-- Run this migration when TypeORM synchronize is disabled.

ALTER TABLE mail_inbox
  ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isStarred" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_mail_inbox_is_read
  ON mail_inbox ("isRead");

CREATE INDEX IF NOT EXISTS idx_mail_inbox_is_starred
  ON mail_inbox ("isStarred");
