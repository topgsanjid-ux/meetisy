import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '../../../../lib/supabase/server';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey && !resendApiKey.includes('your_resend') ? new Resend(resendApiKey) : null;

/**
 * GET/POST /api/cron/automation
 * Cron-triggered endpoint that processes active automation rules.
 * 
 * Deploy as a Vercel/external cron job:
 *   curl -X POST https://your-domain.com/api/cron/automation
 * 
 * Workflow:
 * 1. Fetch all active automation_rules from Supabase
 * 2. Check if each rule's cron_expression matches the current time window
 * 3. Send emails via Resend for matching rules
 * 4. Update last_triggered_at
 */
export async function GET() {
  return handleAutomationCron();
}

export async function POST() {
  return handleAutomationCron();
}

async function handleAutomationCron() {
  try {
    const now = new Date();
    const results = [];
    let rules = [];

    // Fetch active rules from Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data, error } = await supabaseServer
          .from('automation_rules')
          .select('*')
          .eq('is_active', true);

        if (!error && data) {
          rules = data;
        }
      } catch (dbErr) {
        console.warn('Supabase automation rules fetch failed:', dbErr.message);
      }
    }

    // Fallback: try in-memory store
    if (rules.length === 0) {
      try {
        const mod = await import('../../automation/route');
        rules = (mod.automationStore || []).filter(r => r.is_active);
      } catch (_) {}
    }

    if (rules.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active automation rules found.',
        processed: 0,
        timestamp: now.toISOString()
      });
    }

    const fromEmail = process.env.DIGEST_EMAIL_FROM || 'onboarding@resend.dev';

    for (const rule of rules) {
      // Check if this rule should trigger now
      if (!shouldTrigger(rule.cron_expression, now)) {
        continue;
      }

      const emailSubject = getRuleSubject(rule.rule_type);
      const htmlBody = buildRuleEmail(rule);

      if (resend && rule.recipient_emails && rule.recipient_emails.length > 0) {
        for (const email of rule.recipient_emails) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: email,
              subject: emailSubject,
              html: htmlBody
            });
            results.push({ rule_id: rule.id, email, status: 'sent' });
          } catch (emailErr) {
            results.push({ rule_id: rule.id, email, status: 'failed', error: emailErr.message });
          }
        }
      } else {
        results.push({
          rule_id: rule.id,
          status: resend ? 'no_recipients' : 'demo_mode',
          recipients: rule.recipient_emails || []
        });
      }

      // Update last_triggered_at in Supabase
      try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
          await supabaseServer
            .from('automation_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Automation cron processed ${results.length} action(s).`,
      results,
      rulesChecked: rules.length,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Automation cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Simple cron matching: checks if the current time falls within the cron expression's
 * minute and hour fields. This is a lightweight matcher suitable for hourly/daily triggers.
 * For production, use a full cron parser library.
 */
function shouldTrigger(cronExpression, now) {
  if (!cronExpression) return false;

  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [minuteField, hourField, , , dayOfWeekField] = parts;
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();
  const currentDow = now.getDay(); // 0 = Sunday

  // Check minute
  if (minuteField !== '*' && !matchCronField(minuteField, currentMinute)) return false;

  // Check hour
  if (hourField !== '*' && !matchCronField(hourField, currentHour)) return false;

  // Check day of week
  if (dayOfWeekField !== '*' && !matchCronField(dayOfWeekField, currentDow)) return false;

  return true;
}

function matchCronField(field, value) {
  // Handle comma-separated values (e.g., "1,3,5")
  const parts = field.split(',');
  for (const part of parts) {
    // Handle ranges (e.g., "1-5")
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (value >= start && value <= end) return true;
    }
    // Handle step values (e.g., "*/5")
    else if (part.includes('/')) {
      const [, step] = part.split('/').map(Number);
      if (step && value % step === 0) return true;
    }
    // Exact match
    else if (parseInt(part, 10) === value) {
      return true;
    }
  }
  return false;
}

function getRuleSubject(ruleType) {
  switch (ruleType) {
    case 'standup_reminder': return '📣 Standup Reminder — Time to Submit Your Update';
    case 'blocker_followup': return '🚨 Blocker Follow-up — Update Required';
    case 'digest': return '📊 Daily Team Digest — mvp_PRO Summary';
    default: return '📣 mvp_PRO Notification';
  }
}

function buildRuleEmail(rule) {
  const message = rule.message_template || 'You have a pending action from mvp_PRO.';
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; background-color: #0a0c10; color: #f3f4f6; padding: 28px; border-radius: 12px; max-width: 520px; margin: auto;">
      <h2 style="color: #6366f1; margin-top: 0;">⚡ mvp_PRO Automation</h2>
      <p style="color: #9ca3af; font-size: 12px;">Rule: <code style="color: #818cf8;">${rule.rule_type}</code> • Schedule: <code style="color: #818cf8;">${rule.cron_expression}</code></p>
      
      <div style="background: #12161f; border: 1px solid #1f2937; padding: 18px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #e5e7eb; font-size: 15px; line-height: 1.6; margin: 0;">${message}</p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Open mvp_PRO →
        </a>
      </div>

      <p style="font-size: 11px; color: #6b7280; margin-top: 28px; text-align: center;">
        Automated via mvp_PRO Scheduler
      </p>
    </div>
  `;
}
