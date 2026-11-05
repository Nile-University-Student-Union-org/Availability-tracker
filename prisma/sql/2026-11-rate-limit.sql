-- Additive, and it must exist before the deploy: with database storage, sign-in fails if this table is missing.
CREATE TABLE IF NOT EXISTS rate_limit (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_key_key" ON rate_limit(key);
