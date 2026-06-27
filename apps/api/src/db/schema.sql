CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  account VARCHAR(255) NOT NULL DEFAULT 'default',
  username VARCHAR(255),
  status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'error')),
  error TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_platform ON action_logs (platform);
CREATE INDEX IF NOT EXISTS idx_action_logs_account ON action_logs (account);
