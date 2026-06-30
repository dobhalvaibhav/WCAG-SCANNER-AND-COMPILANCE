import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'

declare global {
  interface Window {
    axe: any
  }
}

export async function runScan(url: string) {
  let browser = null

  try {
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar'
    )

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setBypassCSP(true)

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    })

    await new Promise(r => setTimeout(r, 2000))

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js'
    })

    await page.waitForFunction(
      'typeof window.axe !== "undefined"',
      { timeout: 10000 }
    )

    // Use a string to avoid serialization issues
    const rawJson = await page.evaluate(() => {
      return new Promise<string>((resolve, reject) => {
        window.axe.run(
          { runOnly: ['wcag2a', 'wcag2aa'] },
          function(err: any, results: any) {
            if (err) return reject(err.toString())
            
            try {
              var output = {
                url: results.url,
                violations: results.violations.map(function(v: any) {
                  return {
                    id: v.id,
                    impact: v.impact || 'minor',
                    description: v.description,
                    help: v.help,
                    helpUrl: v.helpUrl,
                    nodes: v.nodes.slice(0, 3).map(function(n: any) {
                      return {
                        html: (n.html || '').substring(0, 300),
                        target: n.target.map(function(t: any) {
                          return typeof t === 'string' ? t : String(t)
                        }),
                        failureSummary: n.failureSummary || ''
                      }
                    })
                  }
                }),
                passes: results.passes.length
              }
              resolve(JSON.stringify(output))
            } catch(e: any) {
              reject(e.toString())
            }
          }
        )
      })
    })

    // Detect overlay / accessibility widget scripts
    const hasOverlayWidget = await page.evaluate(() => {
      const overlaySelectors = [
        '[class*="accessibe"]', '[id*="accessibe"]',
        '[class*="userway"]', '[id*="userway"]',
        '[class*="accessibility-widget"]',
        'script[src*="accessibe"]', 'script[src*="userway"]',
      ]
      return overlaySelectors.some(sel => document.querySelector(sel) !== null)
    })

    const data = JSON.parse(rawJson)
    const violations = data.violations || []

    let deductions = 0
    let critical = 0
    let serious = 0
    let moderate = 0
    let minor = 0

    violations.forEach(function(v: any) {
      if (v.impact === 'critical') { critical++; deductions += 8 }
      else if (v.impact === 'serious') { serious++; deductions += 4 }
      else if (v.impact === 'moderate') { moderate++; deductions += 2 }
      else { minor++; deductions += 0.5 }
    })

    const score = Math.max(0, Math.min(100, Math.round(100 - deductions)))

    return {
      url: data.url || url,
      score,
      violations,
      passes: data.passes || 0,
      totalViolations: violations.length,
      hasOverlayWidget,
      critical,
      serious,
      moderate,
      minor,
      bigSix: {
        contrast: violations.filter(function(v: any) { return v.id === 'color-contrast' }).length,
        altText: violations.filter(function(v: any) { return v.id === 'image-alt' }).length,
        labels: violations.filter(function(v: any) { return v.id === 'label' }).length,
        links: violations.filter(function(v: any) { return v.id === 'link-name' }).length,
        buttons: violations.filter(function(v: any) { return v.id === 'button-name' }).length,
        language: violations.filter(function(v: any) { return v.id === 'html-has-lang' }).length,
      }
    }

  } finally {
    if (browser) await browser.close()
  }
}