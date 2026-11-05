-- Additive: the code live on main ignores this table, so run it before the deploy.
CREATE TABLE IF NOT EXISTS mailer_credential (
  id TEXT PRIMARY KEY,
  "accountEmail" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  "lastError" TEXT,
  "connectedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
