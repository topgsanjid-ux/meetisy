import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAuth, authErrorResponse } from '../../../lib/middleware';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey && !resendApiKey.includes('your_resend') ? new Resend(resendApiKey) : null;

/**
 * POST /api/nudge
 * Send reminder emails to team members via Resend. JWT required.
 * Body: { user_emails: string[], message?: string, team_id?: string }
 */
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const { user_emails, message } = body;

    if (!user_emails || !Array.isArray(user_emails) || user_emails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'user_emails array is required and must not be empty.'
      }, { status: 400 });
    }

    const nudgeMessage = message || `Hey! Just a friendly reminder to submit your daily standup. Your team is waiting to hear from you! 🚀`;
    const fromEmail = process.env.DIGEST_EMAIL_FROM || 'onboarding@resend.dev';
    const senderName = user.name || 'Team Manager';

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; background-color: #0a0c10; color: #f3f4f6; padding: 28px; border-radius: 12px; max-width: 520px; margin: auto;">
        <h2 style="color: #6366f1; margin-top: 0;">📣 Standup Reminder</h2>
        <p style="color: #9ca3af; font-size: 13px; margin-bottom: 20px;">Sent by <strong style="color: #fff;">${senderName}</strong></p>
        
        <div style="background: #12161f; border: 1px solid #1f2937; padding: 18px; border-radius: 8px; margin-bottom: 16px;">
          <p style="color: #e5e7eb; font-size: 15px; line-height: 1.6; margin: 0;">${nudgeMessage}</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Submit Your Standup →
          </a>
        </div>

        <p style="font-size: 11px; color: #6b7280; margin-top: 28px; text-align: center;">
          Sent via mvp_PRO • Async Team Sync
        </p>
      </div>
    `;

    const results = [];

    if (resend) {
      for (const email of user_emails) {
        try {
          const res = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `📣 Standup Reminder from ${senderName}`,
            html: htmlBody
          });
          results.push({ email, status: 'sent', id: res.id });
        } catch (emailErr) {
          results.push({ email, status: 'failed', error: emailErr.message });
        }
      }
    } else {
      // Demo mode — simulate sends
      for (const email of user_emails) {
        results.push({ email, status: 'demo_preview', note: 'RESEND_API_KEY required for actual dispatch.' });
      }
    }

    return NextResponse.json({
      success: true,
      message: resend
        ? `Nudge emails dispatched to ${user_emails.length} recipient(s).`
        : `Demo preview generated for ${user_emails.length} recipient(s). Set RESEND_API_KEY for actual dispatch.`,
      results,
      htmlPreview: htmlBody
    });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
