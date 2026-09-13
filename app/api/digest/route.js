import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req) {
  try {
    const { standups = [], recipientEmail = 'team@company.com' } = await req.json();

    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    
    // Synthesize digest content
    const totalCount = standups.length;
    const blockers = standups.filter(s => s.summary?.blockers && s.summary.blockers !== 'None reported.' && s.summary.blockers !== 'None');

    const emailSubject = `⚡ mvp_PRO Daily Digest - ${todayDate}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #0a0c10; color: #f3f4f6; padding: 20px; border-radius: 10px;">
        <h2 style="color: #6366f1;">⚡ Daily Team Standup Digest</h2>
        <p style="color: #9ca3af; font-size: 14px;">Summary for ${todayDate} (${totalCount} Standups Submitted)</p>
        
        ${blockers.length > 0 ? `
          <div style="background: rgba(244, 63, 94, 0.1); border-left: 4px solid #f43f5e; padding: 12px; margin: 15px 0; border-radius: 6px;">
            <h4 style="color: #f43f5e; margin: 0 0 5px 0;">🚨 Critical Team Blockers (${blockers.length})</h4>
            ${blockers.map(b => `<p style="margin: 3px 0;"><strong>${b.user_name} (${b.user_role}):</strong> ${b.summary.blockers}</p>`).join('')}
          </div>
        ` : `
          <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 12px; margin: 15px 0; border-radius: 6px; color: #10b981;">
            <strong>✓ All clear! Zero critical blockers reported today.</strong>
          </div>
        `}

        <h3 style="color: #fff; margin-top: 20px;">Individual Member Updates</h3>
        ${standups.map(s => `
          <div style="background: #12161f; border: 1px solid #1f2937; padding: 15px; margin-bottom: 12px; border-radius: 8px;">
            <strong style="color: #fff; font-size: 15px;">${s.user_name}</strong> 
            <span style="color: #9ca3af; font-size: 12px;"> - ${s.user_role}</span>
            <div style="margin-top: 8px; font-size: 13px;">
              <p style="margin: 4px 0;"><strong style="color: #6366f1;">✅ Done:</strong> ${s.summary?.status || 'N/A'}</p>
              <p style="margin: 4px 0;"><strong style="color: #06b6d4;">🚀 Next:</strong> ${s.summary?.next_steps || 'N/A'}</p>
            </div>
          </div>
        `).join('')}

        <p style="font-size: 12px; color: #6b7280; margin-top: 25px; text-align: center;">
          Sent automatically via mvp_PRO Engine
        </p>
      </div>
    `;

    if (resend) {
      const fromEmail = process.env.DIGEST_EMAIL_FROM || 'onboarding@resend.dev';
      await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: emailSubject,
        html: htmlBody,
      });
    }

    return NextResponse.json({
      success: true,
      message: resend ? `Email digest sent to ${recipientEmail}` : 'Demo digest preview generated successfully (RESEND_API_KEY required for actual SMTP dispatch).',
      htmlPreview: htmlBody
    });
  } catch (error) {
    console.error('Digest API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
