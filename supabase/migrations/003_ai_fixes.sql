-- ================================================
-- WCAG SCANNER — AI FIX GENERATOR
-- ================================================

-- Add AI fix columns to violations table
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_fix_html TEXT;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_fix_explanation TEXT;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_fix_generated_at TIMESTAMPTZ;

-- Create AI fix usage tracking table
CREATE TABLE IF NOT EXISTS ai_fix_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  fixes_generated INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- RLS
ALTER TABLE ai_fix_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI fix usage"
  ON ai_fix_usage FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_fix_usage_user_month
  ON ai_fix_usage(user_id, month_year);