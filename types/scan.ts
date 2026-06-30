export interface ScanViolation {
  id: string;
  rule_id: string;
  rule_description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcag_criterion: string;
  wcag_level: 'A' | 'AA' | 'AAA';
  page_url: string;
  element_html: string;
  element_selector: string;
  fix_summary: string;
  fix_detail: string;
  help_url: string;
}

export interface BigSixCounts {
  contrast: number;
  alt_text: number;
  labels: number;
  links: number;
  buttons: number;
  lang: number;
}

export interface ScanResult {
  id: string;
  user_id?: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pages_scanned: number;
  pages_requested: number;
  compliance_score: number | null;
  total_violations: number;
  critical_count: number;
  serious_count: number;
  moderate_count: number;
  minor_count: number;
  wcag_level: 'A' | 'AA' | 'AAA';
  has_overlay_widget: boolean;
  big_six: BigSixCounts | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  violations?: ScanViolation[];
}

export interface ScanRequest {
  url: string;
  max_pages?: number;
  wcag_level?: 'A' | 'AA' | 'AAA';
}

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';
