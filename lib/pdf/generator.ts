import puppeteer from 'puppeteer';

interface ReportData {
  id: string;
  scan_id: string;
  name?: string;
  scans?: {
    url: string;
    compliance_score: number;
    total_violations: number;
    critical_count: number;
    serious_count: number;
    moderate_count: number;
    minor_count: number;
    wcag_level: string;
    completed_at: string;
    big_six?: Record<string, number>;
  };
}

interface ViolationData {
  rule_id: string;
  rule_description: string;
  impact: string;
  wcag_criterion: string;
  page_url: string;
  element_html: string;
  element_selector: string;
  fix_summary: string;
  fix_detail: string;
  help_url: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#2DD4BF';
  if (score >= 75) return '#22D3A0';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'critical':
      return '#FF3B3B';
    case 'serious':
      return '#FF7A00';
    case 'moderate':
      return '#FFB800';
    case 'minor':
      return '#64B5F6';
    default:
      return '#8B8BA7';
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function generatePDFReport(report: ReportData, violations: ViolationData[]): Promise<Buffer> {
  const scan = report.scans;
  if (!scan) throw new Error('Scan data not found');

  const scoreColor = scan.compliance_score != null ? getScoreColor(scan.compliance_score) : '#8B8BA7';
  const dateStr = scan.completed_at ? new Date(scan.completed_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'N/A';

  const violationsByCritical = violations.filter((v) => v.impact === 'critical');
  const violationsBySerious = violations.filter((v) => v.impact === 'serious');
  const violationsByModerate = violations.filter((v) => v.impact === 'moderate');
  const violationsByMinor = violations.filter((v) => v.impact === 'minor');

  const bigSix = scan.big_six || {};

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WCAG Compliance Report - ${escapeHtml(scan.url)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a2e; font-size: 12px; line-height: 1.6; }
    .cover { text-align: center; padding: 60px 40px; page-break-after: always; }
    .cover h1 { font-size: 32px; color: #6C47FF; margin-bottom: 20px; }
    .cover .url { font-size: 16px; color: #555; margin-bottom: 40px; }
    .score-circle { width: 160px; height: 160px; border-radius: 50%; background: ${scoreColor}; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
    .score-circle .score { font-size: 56px; font-weight: 900; color: white; }
    .score-circle .label { font-size: 12px; color: rgba(255,255,255,0.8); }
    .cover .date { color: #888; font-size: 14px; margin-top: 20px; }
    .page { padding: 40px; page-break-after: always; }
    h2 { font-size: 22px; color: #6C47FF; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #6C47FF; }
    h3 { font-size: 16px; color: #333; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f5f5f5; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; color: white; }
    .violation { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 12px 0; page-break-inside: avoid; }
    .violation .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .violation h4 { font-size: 14px; margin: 0; }
    .code-block { background: #1a1a2e; color: #a8ff60; padding: 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 11px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 8px 0; }
    .fix-steps { margin: 8px 0; padding-left: 20px; }
    .fix-steps li { margin: 4px 0; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #888; padding: 10px; border-top: 1px solid #e0e0e0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .summary-card { text-align: center; padding: 16px; border-radius: 8px; border: 1px solid #e0e0e0; }
    .summary-card .count { font-size: 28px; font-weight: 900; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>WCAG Compliance Report</h1>
    <p class="url">${escapeHtml(scan.url)}</p>
    <div class="score-circle">
      <div>
        <div class="score">${scan.compliance_score != null ? scan.compliance_score : 'N/A'}</div>
        <div class="label">COMPLIANCE SCORE</div>
      </div>
    </div>
    <p class="date">Scanned: ${dateStr}</p>
    <p style="color: #888; font-size: 11px; margin-top: 10px;">WCAG Level: ${scan.wcag_level} | Pages Scanned: ${violations.length > 0 ? '1' : '1'}</p>
  </div>

  <div class="page">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="count" style="color: #FF3B3B;">${scan.critical_count || 0}</div>
        <div>Critical</div>
      </div>
      <div class="summary-card">
        <div class="count" style="color: #FF7A00;">${scan.serious_count || 0}</div>
        <div>Serious</div>
      </div>
      <div class="summary-card">
        <div class="count" style="color: #FFB800;">${scan.moderate_count || 0}</div>
        <div>Moderate</div>
      </div>
      <div class="summary-card">
        <div class="count" style="color: #64B5F6;">${scan.minor_count || 0}</div>
        <div>Minor</div>
      </div>
    </div>

    <h3>Big Six Violations</h3>
    <p style="color: #666; font-size: 11px;">These six issues cause 96% of all WCAG failures.</p>
    <table>
      <tr><th>Issue Type</th><th>Count</th></tr>
      <tr><td>Low Contrast Text</td><td>${bigSix.contrast || 0}</td></tr>
      <tr><td>Missing Image Alt Text</td><td>${bigSix.alt_text || 0}</td></tr>
      <tr><td>Missing Form Labels</td><td>${bigSix.labels || 0}</td></tr>
      <tr><td>Empty Links</td><td>${bigSix.links || 0}</td></tr>
      <tr><td>Empty Buttons</td><td>${bigSix.buttons || 0}</td></tr>
      <tr><td>Missing Document Language</td><td>${bigSix.lang || 0}</td></tr>
    </table>

    <h3>Violations by Severity</h3>
    <table>
      <tr><th>Rule ID</th><th>Description</th><th>Impact</th><th>WCAG</th></tr>
      ${violations.slice(0, 50).map((v) => `
        <tr>
          <td style="font-family: monospace; font-size: 10px;">${escapeHtml(v.rule_id)}</td>
          <td>${escapeHtml(v.rule_description.slice(0, 80))}</td>
          <td><span class="badge" style="background: ${getImpactColor(v.impact)}">${v.impact}</span></td>
          <td>${escapeHtml(v.wcag_criterion)}</td>
        </tr>
      `).join('')}
    </table>
    ${violations.length > 50 ? `<p style="color: #888;">Showing 50 of ${violations.length} violations</p>` : ''}
  </div>

  ${violationsByCritical.length > 0 ? `
  <div class="page">
    <h2>Critical Violations</h2>
    ${violationsByCritical.slice(0, 20).map((v, i) => `
      <div class="violation">
        <div class="header">
          <h4>${i + 1}. ${escapeHtml(v.rule_id)} — ${escapeHtml(v.wcag_criterion)}</h4>
          <span class="badge" style="background: ${getImpactColor(v.impact)}">${v.impact}</span>
        </div>
        <p>${escapeHtml(v.rule_description)}</p>
        ${v.element_html ? `<div class="code-block">${escapeHtml(v.element_html)}</div>` : ''}
        ${v.element_selector ? `<p style="font-size: 10px; color: #888;">Selector: ${escapeHtml(v.element_selector)}</p>` : ''}
        <p style="font-weight: 600; margin-top: 8px;">Fix:</p>
        <p>${escapeHtml(v.fix_summary)}</p>
        ${v.fix_detail ? `<ul class="fix-steps">${v.fix_detail.split('\n').filter(Boolean).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${violationsBySerious.length > 0 ? `
  <div class="page">
    <h2>Serious Violations</h2>
    ${violationsBySerious.slice(0, 30).map((v, i) => `
      <div class="violation">
        <div class="header">
          <h4>${i + 1}. ${escapeHtml(v.rule_id)} — ${escapeHtml(v.wcag_criterion)}</h4>
          <span class="badge" style="background: ${getImpactColor(v.impact)}">${v.impact}</span>
        </div>
        <p>${escapeHtml(v.rule_description)}</p>
        ${v.element_html ? `<div class="code-block">${escapeHtml(v.element_html)}</div>` : ''}
        <p style="font-weight: 600; margin-top: 8px;">Fix:</p>
        <p>${escapeHtml(v.fix_summary)}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    Generated by WCAG Scanner &mdash; Automated scan results. Does not constitute legal advice. &mdash; Page <span class="pageNumber"></span>
  </div>
</body>
</html>`;

  // Generate PDF using puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 9px; color: #888; padding: 0 40px;">
          Generated by WCAG Scanner — Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
