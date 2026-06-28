import type { ScanViolation, BigSixCounts } from '@/types/scan';
import { calculateComplianceScore, calculateBigSix } from './scoring';
import { getFixGuide, getFixGuideDescription } from './violations';
import { discoverPages } from './crawler';
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'

const SCAN_TIMEOUT = 30000;

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

interface AxeResult {
  violations: AxeViolation[];
  passes: Array<{ id: string }>;
  incomplete: Array<{ id: string }>;
}

interface RunScanParams {
  url: string;
  maxPages?: number;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  /** Caller-provided axe-core source — avoids webpack path issues */
  axeCoreSource?: string;
}

interface ScanOutput {
  scan: {
    url: string;
    status: string;
    pages_scanned: number;
    pages_requested: number;
    compliance_score: number | null;
    total_violations: number;
    critical_count: number;
    serious_count: number;
    moderate_count: number;
    minor_count: number;
    wcag_level: string;
    big_six: BigSixCounts | null;
    error_message: string | null;
    started_at: string;
    completed_at: string;
  };
  violations: Omit<ScanViolation, 'id' | 'scan_id' | 'created_at'>[];
}

function getImpactLevel(impact: string | null | undefined): 'critical' | 'serious' | 'moderate' | 'minor' {
  if (!impact) return 'moderate';
  if (impact === 'critical') return 'critical';
  if (impact === 'serious') return 'serious';
  if (impact === 'moderate') return 'moderate';
  return 'minor';
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

function getWcagForRule(ruleId: string, wcagTags: string[]): string {
  for (const tag of wcagTags) {
    const match = tag.match(/wcag(\d)(\d)(\d)/i);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}`;
    }
  }

  const knownWcag: Record<string, string> = {
    'color-contrast': '1.4.3',
    'image-alt': '1.1.1',
    'label': '1.3.1',
    'link-name': '2.4.4',
    'button-name': '4.1.2',
    'html-has-lang': '3.1.1',
    'document-title': '2.4.2',
    'aria-required-attr': '4.1.2',
    'aria-valid-attr': '4.1.2',
    'landmark-one-main': '1.3.1',
    'page-has-heading-one': '1.3.1',
    'skip-link': '2.4.1',
    'tabindex': '2.4.3',
    'duplicate-id': '4.1.1',
    'frame-title': '4.1.2',
    'meta-viewport': '1.4.4',
    'heading-order': '1.3.1',
    'list': '1.3.1',
    'image-redundant-alt': '1.1.1',
    'label-title-only': '1.3.1',
  };

  return knownWcag[ruleId] || 'N/A';
}

function getWcagLevel(ruleId: string, wcagTags: string[]): 'A' | 'AA' | 'AAA' {
  for (const tag of wcagTags) {
    if (tag.startsWith('wcag') && tag.includes('aaa')) return 'AAA';
    if (tag.startsWith('wcag') && tag.includes('aa')) return 'AA';
    if (tag.startsWith('wcag') && tag.includes('a')) return 'A';
  }

  // Known mappings
  const levels: Record<string, 'A' | 'AA' | 'AAA'> = {
    'color-contrast': 'AA',
    'image-alt': 'A',
    'label': 'A',
    'link-name': 'A',
    'button-name': 'A',
    'html-has-lang': 'A',
    'document-title': 'A',
    'aria-required-attr': 'A',
    'aria-valid-attr': 'A',
    'landmark-one-main': 'A',
    'page-has-heading-one': 'A',
    'skip-link': 'A',
    'tabindex': 'A',
    'duplicate-id': 'A',
    'frame-title': 'A',
    'meta-viewport': 'AA',
    'heading-order': 'A',
    'list': 'A',
    'image-redundant-alt': 'A',
    'label-title-only': 'A',
  };

  return levels[ruleId] || 'AA';
}

export async function runScan(params: RunScanParams): Promise<ScanOutput> {
  const { url: rawUrl, maxPages = 1, wcagLevel = 'AA' } = params;
  const url = normalizeUrl(rawUrl);

  const allViolations: Omit<ScanViolation, 'id' | 'scan_id' | 'created_at'>[] = [];

  let browser: any = null;
  let pagesScanned = 0;

  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'
      ),
      headless: true,
    });

    const scanPage = async (pageUrl: string) => {
      const page = await browser.newPage();

      try {
        await page.setDefaultNavigationTimeout(SCAN_TIMEOUT);
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent(
          'Mozilla/5.0 (compatible; WCAGScanner/1.0; +https://wcagscanner.com)'
        );

        // Disable CSP to allow external script injection
        await page.setBypassCSP(true)

        await page.goto(pageUrl, {
          waitUntil: 'networkidle2',
          timeout: SCAN_TIMEOUT,
        });

        // Wait for page to settle
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Inject axe-core from CDN
        await page.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js'
        })

        // Wait for axe to be ready
        await page.waitForFunction(
          () => typeof (window as any).axe !== 'undefined',
          { timeout: 15000 }
        )

        // Run axe with serializable-only options and manually extract data
        const results = await page.evaluate(async () => {
          const axeResults = await (window as any).axe.run(
            document,
            {
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa']
              },
              resultTypes: ['violations', 'passes'],
              elementRef: false,
              selectors: true,
              ancestry: false,
              xpath: false
            }
          )

          // Extract only serializable data inside the browser
          return {
            violations: axeResults.violations.map((v: any) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              help: v.help,
              helpUrl: v.helpUrl,
              tags: v.tags,
              nodes: v.nodes.map((n: any) => ({
                html: n.html,
                target: n.target,
                failureSummary: n.failureSummary
              }))
            })),
            passes: axeResults.passes.map((p: any) => ({
              id: p.id,
              impact: p.impact,
              description: p.description
            })),
            testEngine: axeResults.testEngine,
            url: axeResults.url
          }
        })

        console.log('Scan complete, violations:', results.violations.length)

        return { results, pageUrl };
      } finally {
        await page.close();
      }
    };

    // Scan the main page
    const mainResult = await scanPage(url);
    pagesScanned = 1;

    // Process main page violations
    for (const v of mainResult.results.violations) {
      const impact = getImpactLevel(v.impact);
      const fixGuide = getFixGuide(v.id);

      for (const node of v.nodes) {
        allViolations.push({
          rule_id: v.id,
          rule_description: getFixGuideDescription(v.id),
          impact,
          wcag_criterion: getWcagForRule(v.id, v.tags),
          wcag_level: getWcagLevel(v.id, v.tags),
          page_url: mainResult.pageUrl,
          element_html: node.html || '',
          element_selector: Array.isArray(node.target) ? node.target.join(' ') : String(node.target),
          fix_summary: fixGuide?.description || getFixGuideDescription(v.id),
          fix_detail: fixGuide?.fixSteps?.join('\n') || 'Refer to WCAG documentation for this rule.',
          help_url: v.helpUrl || '',
        });
      }
    }

    // Crawl additional pages if requested
    if (maxPages > 1 && pagesScanned < maxPages) {
      const mainPage = await browser.newPage();

      try {
        await mainPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const additionalUrls = await discoverPages(url, mainPage, maxPages - 1);

        for (const additionalUrl of additionalUrls) {
          if (pagesScanned >= maxPages) break;

          try {
            const pageResult = await scanPage(additionalUrl);
            pagesScanned++;

            for (const v of pageResult.results.violations) {
              const impact = getImpactLevel(v.impact);
              const fixGuide = getFixGuide(v.id);

              for (const node of v.nodes) {
                allViolations.push({
                  rule_id: v.id,
                  rule_description: getFixGuideDescription(v.id),
                  impact,
                  wcag_criterion: getWcagForRule(v.id, v.tags),
                  wcag_level: getWcagLevel(v.id, v.tags),
                  page_url: pageResult.pageUrl,
                  element_html: node.html || '',
                  element_selector: Array.isArray(node.target) ? node.target.join(' ') : String(node.target),
                  fix_summary: fixGuide?.description || getFixGuideDescription(v.id),
                  fix_detail: fixGuide?.fixSteps?.join('\n') || 'Refer to WCAG documentation.',
                  help_url: v.helpUrl || '',
                });
              }
            }
          } catch {
            // Skip pages that fail to load
          }
        }
      } finally {
        try { await mainPage.close(); } catch { /* already closed */ }
      }
    }

    // Calculate scores
    const violationCounts = allViolations.reduce(
      (acc, v) => {
        acc.total++;
        if (v.impact === 'critical') acc.critical++;
        else if (v.impact === 'serious') acc.serious++;
        else if (v.impact === 'moderate') acc.moderate++;
        else acc.minor++;
        return acc;
      },
      { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }
    );

    const { score } = calculateComplianceScore(allViolations);
    const bigSix = calculateBigSix(allViolations);

    return {
      scan: {
        url,
        status: 'completed',
        pages_scanned: pagesScanned,
        pages_requested: maxPages,
        compliance_score: score,
        total_violations: violationCounts.total,
        critical_count: violationCounts.critical,
        serious_count: violationCounts.serious,
        moderate_count: violationCounts.moderate,
        minor_count: violationCounts.minor,
        wcag_level: wcagLevel,
        big_six: bigSix,
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      violations: allViolations,
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown scan error';

    return {
      scan: {
        url,
        status: 'failed',
        pages_scanned: pagesScanned,
        pages_requested: maxPages,
        compliance_score: null,
        total_violations: 0,
        critical_count: 0,
        serious_count: 0,
        moderate_count: 0,
        minor_count: 0,
        wcag_level: wcagLevel,
        big_six: null,
        error_message: errorMessage,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      violations: [],
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser may already be closed
      }
    }
  }
}