-- ================================================
-- WCAG SCANNER — COMPLIANCE ASSISTANT CHATBOT
-- ================================================

-- Create chat usage tracking table
CREATE TABLE IF NOT EXISTS chatbot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  messages_sent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- RLS
ALTER TABLE chatbot_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chatbot usage"
  ON chatbot_usage FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chatbot_usage_user_month
  ON chatbot_usage(user_id, month_year);