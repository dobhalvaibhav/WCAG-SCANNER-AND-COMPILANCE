-- ================================================
-- WCAG SCANNER — LAWSUIT RISK SCORE
-- ================================================

-- Add overlay widget detection column to scans table
ALTER TABLE scans ADD COLUMN IF NOT EXISTS has_overlay_widget BOOLEAN DEFAULT FALSE;