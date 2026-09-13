import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey && !resendApiKey.includes('your_resend') ? new Resend(resendApiKey) : null;

/**
 * Scheduled Cron Digest Trigger Endpoint
 * Call via: GET /api/cron/digest or POST /api/cron/digest
 * Trigger with crontab: `0 0 * * * curl -X POST https://your-domain.com/api/cron/digest`
 */
export async function POST(req) {
  return handleDigestTrigger();
}

export async function GET(req) {
  return handleDigestTrigger();
}

async function handleDigestTrigger() {
  try {
    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    const recipientEmail = process.env.DIGEST_RECIPIENT_EMAIL || 'engineering-team@company.com';
    const fromEmail = process.env.DIGEST_EMAIL_FROM || 'standup@yourdomain.com';

    // Fetch standups
    const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    let standups = [];
    try {
      const res = await fetch(`${host}/api/standups`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) standups = data.standups;
    } catch (_) {}

    const blockers = standups.filter(s => s.summary?.blockers && s.summary.blockers !== 'None reported.' && s.summary.blockers !== 'None');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #0a0c10; color: #f3f4f6; padding: 24px; border-radius: 12px; max-width: 600px; margin: auto;">
        <h2 style="color: #6366f1; margin-top: 0;">⚡ mvp_PRO — Automated Daily Digest</h2>
        <p style="color: #9ca3af; font-size: 14px; margin-bottom: 20px;">Sprint Cycle Update for ${todayDate} (${standups.length} Updates Reported)</p>

        ${blockers.length > 0 ? `
          <div style="background: rgba(244, 63, 94, 0.12); border-left: 4px solid #f43f5e; padding: 14px; margin-bottom: 20px; border-radius: 8px;">
            <h4 style="color: #f43f5e; margin: 0 0 8px 0; font-size: 15px;">🚨 Attention Required: ${blockers.length} Active Blockers</h4>
            ${blockers.map(b => `
              <div style="margin-bottom: 6px;">
                <strong style="color: #fff;">${b.user_name} (${b.user_role}):</strong>
                <span style="color: #fda4af;"> ${b.summary.blockers}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="background: rgba(16, 185, 129, 0.12); border-left: 4px solid #10b981; padding: 14px; margin-bottom: 20px; border-radius: 8px; color: #10b981;">
            <strong>✓ All Clear! Zero critical blockers reported today.</strong>
          </div>
        `}

        <h3 style="color: #fff; margin-bottom: 12px;">Team Member Highlights</h3>
        ${standups.map(s => `
          <div style="background: #12161f; border: 1px solid #1f2937; padding: 14px; margin-bottom: 12px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <strong style="color: #fff; font-size: 15px;">${s.user_name}</strong>
              <span style="color: #9ca3af; font-size: 12px;">${s.user_role}</span>
            </div>
            <div style="font-size: 13px; color: #d1d5db; line-height: 1.4;">
              <p style="margin: 4px 0;"><strong style="color: #6366f1;">✅ Completed:</strong> ${s.summary?.status || 'N/A'}</p>
              <p style="margin: 4px 0;"><strong style="color: #06b6d4;">🚀 Next Target:</strong> ${s.summary?.next_steps || 'N/A'}</p>
              ${s.summary?.decisions && s.summary.decisions !== 'No major architectural decisions reported today.' ? `
                <p style="margin: 4px 0;"><strong style="color: #f59e0b;">💡 Decision:</strong> ${s.summary.decisions}</p>
              ` : ''}
            </div>
          </div>
        `).join('')}

        <p style="font-size: 11px; color: #6b7280; margin-top: 30px; text-align: center;">
          Dispatched automatically by mvp_PRO Engine • Daily Async Sync
        </p>
      </div>
    `;

    if (resend) {
      await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: `⚡ mvp_PRO Daily Digest — ${todayDate}`,
        html: htmlBody
      });
    }

    return NextResponse.json({
      success: true,
      message: resend ? `Automated cron digest sent to ${recipientEmail}` : 'Cron digest generated successfully (preview mode).',
      timestamp: new Date().toISOString(),
      standupsCount: standups.length
    });
  } catch (error) {
    console.error('Cron digest error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
