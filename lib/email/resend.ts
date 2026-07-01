import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendScanCompleteEmail(
  to: string,
  scanUrl: string,
  score: number,
  violationCount: number,
  reportId: string,
  appUrl: string
) {
  await resend.emails.send({
    from: 'WCAG Scanner <zerohisoka0@gmail.com>',
    to,
    subject: `Scan Complete: ${scanUrl} scored ${score}/100`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6C47FF;">Scan Complete</h1>
        <p>Your scan of <strong>${scanUrl}</strong> is ready.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0; font-size: 48px; color: ${score >= 75 ? '#22D3A0' : score >= 50 ? '#F59E0B' : '#EF4444'};">
            ${score}/100
          </h2>
          <p style="margin: 8px 0 0;">${violationCount} violations found</p>
        </div>
        <a href="${appUrl}/dashboard/reports/${reportId}" 
           style="background: #6C47FF; color: white; padding: 12px 24px; 
                  border-radius: 6px; text-decoration: none; display: inline-block;">
          View Full Report
        </a>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">
          Results are automated and not legal advice. 
          Automated scans detect ~57% of WCAG issues.
        </p>
      </div>
    `
  })
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  appUrl: string
) {
  await resend.emails.send({
    from: 'WCAG Scanner <zerohisoka0@gmail.com>',
    to,
    subject: 'Welcome to WCAG Scanner',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6C47FF;">Welcome, ${name}!</h1>
        <p>Your account is ready. Start scanning your website for 
           accessibility issues that could lead to ADA lawsuits.</p>
        <a href="${appUrl}/dashboard/scanner"
           style="background: #6C47FF; color: white; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; display: inline-block;">
          Run Your First Scan
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">
          Automated scans detect ~57% of WCAG issues. 
          Results are not legal advice.
        </p>
      </div>
    `
  })
}